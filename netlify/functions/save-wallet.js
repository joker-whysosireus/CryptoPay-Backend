import CryptoJS from 'crypto-js';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
    console.log("save-wallet.js: event.body:", event.body);

    const headers = {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
    };

    if (event.httpMethod === "OPTIONS") {
        console.log("save-wallet.js: Handling OPTIONS request");
        return {
            statusCode: 200,
            headers: headers,
            body: "",
        };
    }

    try {
        console.log("save-wallet.js: Function started");

        let requestBody;
        if (event.body) {
            try {
                requestBody = JSON.parse(event.body);
                console.log("save-wallet.js: Request body:", requestBody);
            } catch (parseError) {
                console.error("save-wallet.js: Error parsing JSON:", parseError);
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ success: false, error: "Invalid JSON format in request body" }),
                };
            }
        } else {
            console.warn("save-wallet.js: Request body is empty");
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Request body is empty" }),
            };
        }

        const { telegram_user_id, wallet_address } = requestBody;

        if (!telegram_user_id || !wallet_address) {
            console.warn("save-wallet.js: Missing required fields");
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Missing required fields" }),
            };
        }

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error("save-wallet.js: Supabase environment variables not defined");
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Supabase environment variables not defined" }),
            };
        }

        console.log("save-wallet.js: Updating wallet address for user:", telegram_user_id);
        
        // Обновляем поле wallets (тип TEXT) с адресом кошелька
        const { data: updatedUser, error: updateError } = await supabase
            .from('cryptopay')
            .update({ 
                wallets: wallet_address,
                updated_at: new Date().toISOString()
            })
            .eq('telegram_user_id', telegram_user_id)
            .select('*')
            .single();

        if (updateError) {
            console.error("save-wallet.js: Error updating wallet address:", updateError);
            throw updateError;
        }

        console.log("save-wallet.js: Wallet address updated successfully:", updatedUser);

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ 
                success: true,
                user: updatedUser
            })
        };

    } catch (error) {
        console.error("save-wallet.js: Function error:", error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};