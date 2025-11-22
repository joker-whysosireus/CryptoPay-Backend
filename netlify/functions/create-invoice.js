import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';

exports.handler = async (event, context) => {
  // Разрешаем CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Length": "0",
      },
    };
  }

  // Проверка наличия BOT_TOKEN
  if (!process.env.BOT_TOKEN) {
    console.error("BOT_TOKEN не установлен в переменных окружения!");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "BOT_TOKEN не установлен" }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    };
  }

  const botApi = new TelegramBot(process.env.BOT_TOKEN);

  try {
    if (!event.body) {
      throw new Error("Request body is empty");
    }

    const { title, description, payload, currency, prices } = JSON.parse(event.body);

    console.log("Данные запроса на инвойс:", {
      title,
      description,
      payload,
      currency,
      prices
    });

    // Валидация входных данных
    if (!title || typeof title !== 'string' || title.length > 100) {
      throw new Error("Неверный заголовок");
    }
    if (!description || typeof description !== 'string' || description.length > 200) {
      throw new Error("Неверное описание");
    }
    if (currency !== "XTR") {
      throw new Error("Неверная валюта. Должно быть XTR.");
    }
    if (!Array.isArray(prices) || prices.length === 0) {
      throw new Error("Неверный формат цен");
    }
    
    // Проверяем каждую цену
    for (const price of prices) {
      if (typeof price.amount !== 'number' || price.amount <= 0) {
        throw new Error("Неверная цена: amount должен быть положительным числом");
      }
      if (!price.label || typeof price.label !== 'string') {
        throw new Error("Неверная метка цены");
      }
    }

    let invoiceLink;
    try {
      invoiceLink = await botApi.createInvoiceLink(
        title,
        description,
        payload,
        "", // Пусто для Telegram Stars
        currency,
        prices
      );

      console.log("Сгенерированная ссылка на инвойс:", invoiceLink);

      if (!invoiceLink) {
        throw new Error("Invoice link was not generated");
      }

    } catch (createInvoiceError) {
      console.error("Ошибка при создании ссылки на инвойс:", createInvoiceError);
      throw new Error("Не удалось создать ссылку на инвойс: " + createInvoiceError.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ invoiceLink }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    };

  } catch (error) {
    console.error("Ошибка при обработке запроса:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Ошибка при создании инвойса: " + error.message 
      }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    };
  }
};