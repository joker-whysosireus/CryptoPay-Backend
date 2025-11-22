import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    const { telegram_user_id, booster_type } = body;

    if (!telegram_user_id || !booster_type) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: "Missing telegram_user_id or booster_type" 
        }),
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      };
    }

    // Получаем текущие данные пользователя
    const { data: userData, error: selectError } = await supabase
      .from('cryptopay')
      .select('*')
      .eq('telegram_user_id', telegram_user_id)
      .single();

    if (selectError || !userData) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          error: "Failed to fetch user data" 
        }),
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      };
    }

    // Определяем столбец для обновления на основе типа бустера
    const boosterColumns = {
      'mini_booster': 'mini_booster',
      'basic_booster': 'basic_booster',
      'advanced_booster': 'advanced_booster',
      'pro_booster': 'pro_booster',
      'ultimate_booster': 'ultimate_booster',
      'mega_booster': 'mega_booster'
    };

    const columnToUpdate = boosterColumns[booster_type];
    
    if (!columnToUpdate) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: "Invalid booster type" 
        }),
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      };
    }

    // Проверяем, не активирован ли уже бустер
    const isAlreadyActivated = userData[columnToUpdate];
    
    if (isAlreadyActivated) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: "Booster already activated",
          already_activated: true
        }),
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      };
    }

    // Обновляем данные пользователя - устанавливаем бустер в true
    const { error: updateError } = await supabase
      .from('cryptopay')
      .update({
        [columnToUpdate]: true,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_user_id', telegram_user_id);

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
        message: "Booster activated successfully",
        booster_type: booster_type,
        activated: true
      }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    };

  } catch (error) {
    console.error("Unhandled error in update-booster:", error);
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