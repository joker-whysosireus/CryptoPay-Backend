import CryptoJS from 'crypto-js';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
    console.log("watch-ad-reward.js: Function started");

    const headers = {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
    };

    if (event.httpMethod === "OPTIONS") {
        console.log("watch-ad-reward.js: Handling OPTIONS request");
        return {
            statusCode: 200,
            headers: headers,
            body: "",
        };
    }

    try {
        console.log("watch-ad-reward.js: Processing reward request");

        let requestBody;
        if (event.body) {
            try {
                requestBody = JSON.parse(event.body);
                console.log("watch-ad-reward.js: Request body:", requestBody);
            } catch (parseError) {
                console.error("watch-ad-reward.js: Error parsing JSON:", parseError);
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ success: false, error: "Invalid JSON format in request body" }),
                };
            }
        } else {
            console.warn("watch-ad-reward.js: Request body is empty");
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Request body is empty" }),
            };
        }

        const { telegram_user_id } = requestBody;

        if (!telegram_user_id) {
            console.warn("watch-ad-reward.js: telegram_user_id is missing");
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "telegram_user_id is required" }),
            };
        }

        console.log("watch-ad-reward.js: Processing reward for user:", telegram_user_id);

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error("watch-ad-reward.js: Environment variables not defined");
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Environment variables not defined" }),
            };
        }

        try {
            // Находим пользователя в базе данных
            console.log("watch-ad-reward.js: Finding user with telegram_user_id:", telegram_user_id);
            const { data: existingUser, error: selectError } = await supabase
                .from('cryptopay')
                .select('*')
                .eq('telegram_user_id', telegram_user_id)
                .single();

            if (selectError) {
                console.error("watch-ad-reward.js: Error finding user in Supabase:", selectError);
                return {
                    statusCode: 404,
                    headers: headers,
                    body: JSON.stringify({ success: false, error: "User not found" }),
                };
            }

            console.log("watch-ad-reward.js: User found:", existingUser);

            // Проверяем, есть ли у пользователя активный буст
            const hasBoost = existingUser.has_boost || false;
            const rewardAmount = hasBoost ? 0.03 : 0.01;
            
            console.log("watch-ad-reward.js: User has boost:", hasBoost, "Reward amount:", rewardAmount);

            // Рассчитываем новые значения
            const newBalance = parseFloat((existingUser.balance + rewardAmount).toFixed(6));
            const newTotalAdsWatched = existingUser.total_ads_watched + 1;
            const newWeeklyAdsWatched = existingUser.weekly_ads_watched + 1;

            console.log("watch-ad-reward.js: Updating user data - new balance:", newBalance, 
                       "total ads:", newTotalAdsWatched, "weekly ads:", newWeeklyAdsWatched);

            // Обновляем данные пользователя
            const { data: updatedUser, error: updateError } = await supabase
                .from('cryptopay')
                .update({
                    balance: newBalance,
                    total_ads_watched: newTotalAdsWatched,
                    weekly_ads_watched: newWeeklyAdsWatched,
                    updated_at: new Date().toISOString()
                })
                .eq('telegram_user_id', telegram_user_id)
                .select('*')
                .single();

            if (updateError) {
                console.error("watch-ad-reward.js: Error updating user in Supabase:", updateError);
                return {
                    statusCode: 500,
                    headers: headers,
                    body: JSON.stringify({ success: false, error: "Failed to update user data" }),
                };
            }

            console.log("watch-ad-reward.js: User successfully updated:", updatedUser);

            // Отправляем уведомление о награде (опционально)
            try {
                await fetch('https://cryptopayappbackend.netlify.app/.netlify/functions/ad-reward-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: telegram_user_id,
                        username: updatedUser.username,
                        first_name: updatedUser.first_name,
                        reward_amount: rewardAmount,
                        has_boost: hasBoost,
                        timestamp: new Date().toISOString()
                    }),
                });
                console.log("watch-ad-reward.js: Reward notification sent");
            } catch (notificationError) {
                console.error("watch-ad-reward.js: Error sending notification:", notificationError);
                // Продолжаем выполнение даже если уведомление не отправилось
            }

            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    success: true,
                    userData: updatedUser,
                    reward: {
                        amount: rewardAmount,
                        has_boost: hasBoost,
                        message: `Successfully rewarded ${rewardAmount} USDT for watching ad ${hasBoost ? '(Boost active!)' : ''}`
                    }
                }),
            };

        } catch (dbError) {
            console.error("watch-ad-reward.js: Database error:", dbError);
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Database error: " + dbError.message }),
            };
        }

    } catch (error) {
        console.error("watch-ad-reward.js: Netlify Function error:", error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};