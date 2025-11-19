import CryptoJS from 'crypto-js';
import 'dotenv/config';
import { Telegraf } from 'telegraf';

const BOT_TOKEN = process.env.BOT_TOKEN;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

exports.handler = async (event, context) => {
    console.log("withdraw-notification.js: event.body:", event.body);

    const headers = {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
    };

    if (event.httpMethod === "OPTIONS") {
        console.log("withdraw-notification.js: Handling OPTIONS request");
        return {
            statusCode: 200,
            headers: headers,
            body: "",
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
                    headers: headers,
                    body: JSON.stringify({ success: false, error: "Invalid JSON format in request body" }),
                };
            }
        } else {
            console.warn("withdraw-notification.js: Request body is empty");
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Request body is empty" }),
            };
        }

        const { user_id, username, first_name, amount } = requestBody;

        if (!user_id || !amount) {
            console.warn("withdraw-notification.js: Missing required fields");
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ success: false, error: "Missing required fields" }),
            };
        }

        if (!BOT_TOKEN) {
            console.error("withdraw-notification.js: BOT_TOKEN environment variable not defined");
            return {
                statusCode: 500,
                headers: headers,
                body: JSON.stringify({ success: false, error: "BOT_TOKEN environment variable not defined" }),
            };
        }

        const bot = new Telegraf(BOT_TOKEN);
        
        const message = `🔄 New Withdrawal Request\n\n` +
                       `User: ${first_name} (@${username})\n` +
                       `User ID: ${user_id}\n` +
                       `Amount: ${amount} USDT\n` +
                       `Time: ${new Date().toLocaleString()}`;
        
        // Отправляем сообщение разработчику (замените YOUR_CHAT_ID на ваш ID)
        await bot.telegram.sendMessage('7465408366', message);
        
        console.log("withdraw-notification.js: Notification sent successfully");

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error("withdraw-notification.js: Function error:", error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};