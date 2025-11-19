import CryptoJS from 'crypto-js';
import 'dotenv/config';
import { Telegraf } from 'telegraf';

const BOT_TOKEN = process.env.BOT_TOKEN;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

exports.handler = async (event, context) => {
    console.log("user-notification.js: event.body:", event.body);

    const headers = {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
    };

    if (event.httpMethod === "OPTIONS") {
        console.log("user-notification.js: Handling OPTIONS request");
        return {
            statusCode: 200,
            headers: headers,
            body: "",
        };
    }

    try {
        console.log("user-notification.js: Function started");

        let requestBody;
        if (event.body) {
            try {
                requestBody = JSON.parse(event.body);
                console.log("user-notification.js: Request body:", requestBody);
            } catch (parseError) {
                console.error("user-notification.js: Error parsing JSON:", parseError);
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ success: false, error: "Invalid JSON format in request body" }),
                };
            }
        } else {
            console.warn("user-notification.js: Request body is empty");
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Request body is empty" }),
            };
        }

        const { user_id, amount } = requestBody;

        if (!user_id || !amount) {
            console.warn("user-notification.js: Missing required fields");
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Missing required fields" }),
            };
        }

        if (!BOT_TOKEN) {
            console.error("user-notification.js: BOT_TOKEN environment variable not defined");
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ success: false, error: "BOT_TOKEN environment variable not defined" }),
            };
        }

        const bot = new Telegraf(BOT_TOKEN);
        
        const message = `✅ Withdrawal Request Received\n\n` +
                       `Amount: ${amount} USDT\n` +
                       `Status: Processing\n` +
                       `Your funds will be sent within 24 hours.`;
        
        await bot.telegram.sendMessage(user_id, message);
        
        console.log("user-notification.js: User notification sent successfully");

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error("user-notification.js: Function error:", error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};