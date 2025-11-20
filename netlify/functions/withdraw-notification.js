import 'dotenv/config';

const BOT_TOKEN = process.env.BOT_TOKEN;
const CREATOR_ID = process.env.CREATOR_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': CORS_ORIGIN,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    try {
        console.log("withdraw-notification.js: Function started");

        let requestBody;
        if (event.body) {
            try {
                requestBody = JSON.parse(event.body);
                console.log("withdraw-notification.js: Request body:", requestBody);
            } catch (parseError) {
                console.error("withdraw-notification.js: Error parsing JSON:", parseError);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: "Invalid JSON format in request body" }),
                };
            }
        } else {
            console.warn("withdraw-notification.js: Request body is empty");
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: "Request body is empty" }),
            };
        }

        const { user_id, username, first_name, amount } = requestBody;

        if (!user_id || !amount) {
            console.warn("withdraw-notification.js: Missing required fields");
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: "Missing required fields" }),
            };
        }

        if (!BOT_TOKEN || !CREATOR_ID) {
            console.error("withdraw-notification.js: Environment variables not defined");
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ success: false, error: "Environment variables not defined" }),
            };
        }

        // Получаем данные пользователя из базы cryptopay
        let userData = {};
        try {
            const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/cryptopay?telegram_user_id=eq.${user_id}&select=*`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (userResponse.ok) {
                const userDataArray = await userResponse.json();
                if (userDataArray.length > 0) {
                    userData = userDataArray[0];
                }
            }
        } catch (dbError) {
            console.error("withdraw-notification.js: Error fetching user data:", dbError);
            // Продолжаем выполнение даже если не удалось получить данные
        }

        const totalAdsWatched = userData.total_ads_watched || 0;
        const weeklyAdsWatched = userData.weekly_ads_watched || 0;
        const referralsCount = userData.referrals_count || 0;
        const referralsEarned = userData.referrals_earned || 0;

        // Получаем текущую дату в формате "число месяц"
        const now = new Date();
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const day = now.getDate();
        const month = months[now.getMonth()];
        const timeString = `${day} ${month}`;

        // Уведомление пользователю
        try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: user_id,
                    text: `✅ Withdrawal Request Received\n\n` +
                          `Amount: ${amount} USDT\n` +
                          `Status: Processing\n\n` +
                          `The funds will be sent within a week.`,
                    parse_mode: 'Markdown'
                })
            });
            console.log("withdraw-notification.js: User notification sent successfully");
        } catch (userNotifyError) {
            console.error("withdraw-notification.js: Error sending user notification:", userNotifyError);
        }

        // Уведомление создателю
        try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: CREATOR_ID,
                    text: `══════════════════\n` +
                          `🔄 NEW USDT WITHDRAWAL REQUEST\n` +
                          `══════════════════\n\n` +
                          `👤 User: ${first_name || 'Unknown'}\n` +
                          `📱 Username: @${username || 'No username'}\n` +
                          `🆔 User ID: ${user_id}\n` +
                          `💰 Amount: ${amount} USDT\n\n` +
                          `📊 USER STATISTICS:\n` +
                          `📺 Total Ads Watched: ${totalAdsWatched}\n` +
                          `📈 Weekly Ads Watched: ${weeklyAdsWatched}\n` +
                          `👥 Referrals: ${referralsCount}\n` +
                          `🎁 Referrals Earned: ${referralsEarned.toFixed(6)} USDT\n\n` +
                          `⏰ Time: ${timeString}`,
                    parse_mode: 'Markdown'
                })
            });
            console.log("withdraw-notification.js: Creator notification sent successfully");
        } catch (creatorNotifyError) {
            console.error("withdraw-notification.js: Error sending creator notification:", creatorNotifyError);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Withdrawal notifications sent successfully'
            })
        };

    } catch (error) {
        console.error("withdraw-notification.js: Function error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};