import CryptoJS from 'crypto-js';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
    const headers = {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
    };

    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: headers,
            body: "",
        };
    }

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Request body is empty" }),
            };
        }

        const requestBody = JSON.parse(event.body);
        const initData = requestBody.initData;

        if (!initData) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "initData is missing" }),
            };
        }

        const searchParams = new URLSearchParams(initData);
        const userStr = searchParams.get('user');
        const authDate = searchParams.get('auth_date');
        const hash = searchParams.get('hash');

        if (!userStr || !authDate || !hash) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Missing user, auth_date, or hash" }),
            };
        }

        let user;
        try {
            user = JSON.parse(userStr);
        } catch (error) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Error parsing user JSON" }),
            };
        }

        const userId = user.id;
        const firstName = user.first_name;
        const lastName = user.last_name || "";
        const username = user.username;
        const avatarUrl = user.photo_url || null;

        if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Environment variables not defined" }),
            };
        }

        const params = new URLSearchParams(initData);
        params.sort();

        let dataCheckString = "";
        for (const [key, value] of params.entries()) {
            if (key !== "hash") {
                dataCheckString += `${key}=${value}\n`;
            }
        }
        dataCheckString = dataCheckString.trim();

        const secretKey = CryptoJS.HmacSHA256(BOT_TOKEN, "WebAppData").toString(CryptoJS.enc.Hex);
        const calculatedHash = CryptoJS.HmacSHA256(dataCheckString, CryptoJS.enc.Hex.parse(secretKey)).toString(CryptoJS.enc.Hex);

        if (calculatedHash !== hash) {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Hash mismatch" }),
            };
        }

        const date = parseInt(authDate);
        const now = Math.floor(Date.now() / 1000);

        if (now - date > 86400) {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ isValid: false }),
            };
        }

        let userDB;
        try {
            const { data: existingUser, error: selectError } = await supabase
                .from('cryptopay')
                .select('*')
                .eq('telegram_user_id', userId)
                .single();

            if (selectError) {
                if (selectError.code === 'PGRST116') {
                    const cryptopayUserObject = {
                        first_name: firstName,
                        last_name: lastName,
                        username: username,
                        avatar: avatarUrl,
                        telegram_user_id: userId,
                        wallets: []
                    };

                    const { data: newUser, error: insertError } = await supabase
                        .from('cryptopay')
                        .insert([cryptopayUserObject])
                        .select('*')
                        .single();

                    if (insertError) {
                        return {
                            statusCode: 500,
                            headers: headers,
                            body: JSON.stringify({ isValid: false, error: "Failed to create user" }),
                        };
                    }

                    userDB = newUser;
                } else {
                    return {
                        statusCode: 500,
                        headers: headers,
                        body: JSON.stringify({ isValid: false, error: "Database error" }),
                    };
                }
            } else {
                userDB = existingUser;
                
                if (!userDB.avatar && avatarUrl) {
                    const { data: updatedUser, error: updateError } = await supabase
                        .from('cryptopay')
                        .update({ avatar: avatarUrl })
                        .eq('telegram_user_id', userId)
                        .select('*')
                        .single();

                    if (!updateError) {
                        userDB = updatedUser;
                    }
                }
            }

            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({
                    isValid: true, 
                    userData: userDB
                }),
            };

        } catch (dbError) {
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ isValid: false, error: "Database error" }),
            };
        }

    } catch (error) {
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ isValid: false, error: "Server error" }),
        };
    }
};