import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const itemConfigs = {
    // Ad Boost для CryptoPay
    ad_boost: {
        item_id: "ad_boost",
        title: "Ad Boost",
        description: "Increase your ad earnings from 0.01 to 0.03 USDT per view",
        price: 1,
        currency: "XTR",
        dbColumn: "has_boost",
        isBooster: false
    },
    // Бустеры для пассивного заработка
    mini_booster: {
        item_id: "mini_booster",
        title: "Mini Booster",
        description: "Generates 0.0001 USDT per hour",
        price: 1,
        currency: "XTR",
        dbColumn: "mini_booster",
        isBooster: true
    },
    basic_booster: {
        item_id: "basic_booster",
        title: "Basic Booster",
        description: "Generates 0.0005 USDT per hour",
        price: 1,
        currency: "XTR",
        dbColumn: "basic_booster",
        isBooster: true
    },
    advanced_booster: {
        item_id: "advanced_booster",
        title: "Advanced Booster",
        description: "Generates 0.001 USDT per hour",
        price: 1,
        currency: "XTR",
        dbColumn: "advanced_booster",
        isBooster: true
    },
    pro_booster: {
        item_id: "pro_booster",
        title: "Pro Booster",
        description: "Generates 0.005 USDT per hour",
        price: 1,
        currency: "XTR",
        dbColumn: "pro_booster",
        isBooster: true
    },
    ultimate_booster: {
        item_id: "ultimate_booster",
        title: "Ultimate Booster",
        description: "Generates 0.01 USDT per hour",
        price: 1,
        currency: "XTR",
        dbColumn: "ultimate_booster",
        isBooster: true
    },
    mega_booster: {
        item_id: "mega_booster",
        title: "Mega Booster",
        description: "Generates 0.05 USDT per hour",
        price: 1,
        currency: "XTR",
        dbColumn: "mega_booster",
        isBooster: true
    }
};

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        };
    }

    if (!supabaseUrl || !supabaseAnonKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                success: false, 
                error: "Supabase credentials not configured" 
            }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { payload, user_id } = body;

        if (!payload || !user_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    success: false, 
                    error: "Missing payload or user_id" 
                }),
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            };
        }

        let payloadData;
        try {
            payloadData = JSON.parse(payload);
        } catch (error) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    success: false, 
                    error: "Invalid payload format" 
                }),
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            };
        }

        const { item_id } = payloadData;
        
        const itemConfig = itemConfigs[item_id];
        if (!itemConfig) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    success: false, 
                    error: "Unknown item_id" 
                }),
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            };
        }

        const isBooster = itemConfig.isBooster || false;

        // Получаем данные пользователя из таблицы cryptopay
        const { data: fullUserData, error: fullSelectError } = await supabase
            .from('cryptopay')
            .select('*')
            .eq('telegram_user_id', user_id)
            .single();

        if (fullSelectError || !fullUserData) {
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    success: false, 
                    error: "Failed to fetch user data from cryptopay table" 
                }),
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            };
        }

        // Проверка дубликата платежа
        const existingPayments = fullUserData.payments || [];
        const isDuplicate = existingPayments.some(p => p.payload === payload);

        if (isDuplicate) {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    success: true, 
                    duplicate: true 
                }),
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            };
        }

        // Для бустеров: проверка, куплен ли уже бустер (если нужно ограничение на 1)
        if (isBooster && fullUserData[itemConfig.dbColumn] && fullUserData[itemConfig.dbColumn] > 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    success: true, 
                    alreadyOwned: true 
                }),
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            };
        }

        // Подготовка данных для обновления
        const newPayment = { 
            payload: payload, 
            item_id: item_id,
            amount: itemConfig.price,
            timestamp: new Date().toISOString()
        };
        
        const updateData = {
            payments: [...existingPayments, newPayment],
            updated_at: new Date().toISOString()
        };

        // Для бустеров увеличиваем количество
        if (isBooster) {
            const currentCount = fullUserData[itemConfig.dbColumn] || 0;
            updateData[itemConfig.dbColumn] = currentCount + 1;
        }

        // Для ad_boost устанавливаем флаг
        if (item_id === 'ad_boost') {
            updateData.has_boost = true;
        }

        // Обновление пользователя в таблице cryptopay
        const { error: updateError } = await supabase
            .from('cryptopay')
            .update(updateData)
            .eq('telegram_user_id', user_id);

        if (updateError) {
            console.error("User update error:", updateError.message);
            
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    success: false, 
                    error: "Failed to update user data: " + updateError.message 
                }),
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            };
        }

        // Успешное завершение
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true,
                message: "Payment processed successfully",
                boost_activated: item_id === 'ad_boost' ? true : null,
                booster_purchased: isBooster ? item_id : null,
                booster_count: isBooster ? (fullUserData[itemConfig.dbColumn] || 0) + 1 : null
            }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        };

    } catch (error) {
        console.error("Unhandled error in verify-payment:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                success: false, 
                error: "Internal server error: " + error.message 
            }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        };
    }
};