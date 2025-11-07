import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
    const headers = {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: "Request body is empty" }),
            };
        }

        const { telegramUserId, wallets } = JSON.parse(event.body);

        if (!telegramUserId || !wallets) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: "Missing telegramUserId or wallets data" }),
            };
        }

        const { data, error } = await supabase
            .from('cryptopay')
            .update({
                wallets: wallets,
                updated_at: new Date().toISOString()
            })
            .eq('telegram_user_id', telegramUserId)
            .select()
            .single();

        if (error) {
            console.error("Database error:", error);
            throw error;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                data: data 
            }),
        };

    } catch (error) {
        console.error("Function error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: "Internal server error: " + error.message 
            }),
        };
    }
};