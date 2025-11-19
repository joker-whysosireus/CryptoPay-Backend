import CryptoJS from 'crypto-js';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
    console.log("update-balance.js: event.body:", event.body);

    const headers = {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
    };

    if (event.httpMethod === "OPTIONS") {
        console.log("update-balance.js: Handling OPTIONS request");
        return {
            statusCode: 200,
            headers: headers,
            body: "",
        };
    }

    try {
        console.log("update-balance.js: Function started");

        let requestBody;
        if (event.body) {
            try {
                requestBody = JSON.parse(event.body);
                console.log("update-balance.js: Request body:", requestBody);
            } catch (parseError) {
                console.error("update-balance.js: Error parsing JSON:", parseError);
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ success: false, error: "Invalid JSON format in request body" }),
                };
            }
        } else {
            console.warn("update-balance.js: Request body is empty");
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Request body is empty" }),
            };
        }

        const { telegram_user_id, amount } = requestBody;

        if (!telegram_user_id || amount === undefined) {
            console.warn("update-balance.js: Missing required fields");
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Missing required fields" }),
            };
        }

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error("update-balance.js: Supabase environment variables not defined");
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Supabase environment variables not defined" }),
            };
        }

        // Получаем текущий баланс
        console.log("update-balance.js: Fetching current balance for user:", telegram_user_id);
        const { data: user, error: fetchError } = await supabase
            .from('cryptopay')
            .select('balance')
            .eq('telegram_user_id', telegram_user_id)
            .single();

        if (fetchError) {
            console.error("update-balance.js: Error fetching user balance:", fetchError);
            throw fetchError;
        }

        // Обновляем баланс
        const newBalance = Math.max(0, parseFloat(user.balance) + parseFloat(amount)); // Не позволяем балансу уйти в минус
        console.log("update-balance.js: Updating balance from", user.balance, "to", newBalance);

        const { data: updatedUser, error: updateError } = await supabase
            .from('cryptopay')
            .update({ 
                balance: newBalance.toFixed(6) // Используем 6 знаков после запятой как в структуре таблицы
            })
            .eq('telegram_user_id', telegram_user_id)
            .select('*')
            .single();

        if (updateError) {
            console.error("update-balance.js: Error updating balance:", updateError);
            throw updateError;
        }

        console.log("update-balance.js: Balance updated successfully:", updatedUser);

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ 
                success: true, 
                newBalance: updatedUser.balance 
            })
        };

    } catch (error) {
        console.error("update-balance.js: Function error:", error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};