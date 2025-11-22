// netlify/functions/create-invoice.js
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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  const botApi = new TelegramBot(process.env.BOT_TOKEN);

  try {
    // Создание инвойса
    const { title, description, payload, currency, prices } = JSON.parse(event.body);

    // Валидация входных данных
    if (typeof title !== 'string' || title.length > 100) {
      throw new Error("Неверный заголовок");
    }
    if (typeof description !== 'string' || description.length > 200) {
      throw new Error("Неверное описание");
    }
    if (currency !== "XTR") {
      throw new Error("Неверная валюта.  Должно быть XTR.");
    }
    if (!Array.isArray(prices) || prices.length !== 1) {
      throw new Error("Неверный формат цен");
    }
    if (typeof prices[0].amount !== 'number' || prices[0].amount <= 0) {
      throw new Error("Неверная цена");
    }
    if (typeof prices[0].label !== 'string') {
      throw new Error("Неверная метка цены");
    }

    console.log("Данные запроса на инвойс:");
    console.log("Заголовок:", title);
    console.log("Описание:", description);
    console.log("Payload:", payload);
    console.log("Валюта:", currency);
    console.log("Цены:", JSON.stringify(prices));

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
    } catch (createInvoiceError) {
      console.error("Ошибка при создании ссылки на инвойс:", createInvoiceError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Не удалось создать ссылку на инвойс: " + createInvoiceError.message }),
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ invoiceLink }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };

  } catch (error) {
    console.error("Ошибка при обработке запроса:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Общая ошибка: " + error.message }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }
};