/*Activa el modo estricto de JavaScript, lo que ayuda a evitar errores comunes (como usar variables no declaradas) y hace que el código sea más seguro y predecible. */
"use strict";

// @ts-ignore
const stripe = require("stripe")(process.env.STRIPE_KEY); //Se importa e inicializa Stripe usando la clave secreta almacenada

/**
 * order controller
 */

/* Esto importa una función que permite crear controladores personalizados basados en los controladores por defecto de Strapi*/
const { createCoreController } = require("@strapi/strapi").factories;

//Exportación del controlador personalizado para "order"
module.exports = createCoreController("api::order.order", ({ strapi }) => ({ //Se está sobrescribiendo la acción create del controlador del contenido order
  async create(ctx) { //ctx es el objeto de contexto (context) que contiene la petición
    
    //@ts-ignore
    const { products } = ctx.request.body; //Extrae el array de productos enviados desde el frontend.

    console.log("🛒 Productos recibidos:", products);
    console.log("✅ Iniciando procesamiento de productos...");

    try {
      const lineItems = await Promise.all( //Se usa para procesar todos los productos en paralelo
        products.map(async (product) => {
          console.log("🔍 Buscando producto con ID:", product.id);

          /*AQUI ESTABA EL ERROR EN EL CODIGO ANTERIOR */
          const item = await strapi
          .entityService
          .findOne( //Se busca en la base de datos
            "api::product.product",
            product.id,
            {
              populate: ["images", "category"], //Se utiliza para traer también las imágenes y la categoría del producto
            }
          );

          if (!item) {
            console.log(`❌ Producto no encontrado: ${product.id}`);
            throw new Error(`Producto con ID ${product.id} no encontrado`);
          }

          return {
            price_data: {
              currency: "eur", //cop para pesos colombianos
              product_data: {
                name: item.productName,
              },
              unit_amount: Math.round(item.price * 100), //unit_amount debe estar en centavos, por eso se multiplica item.price * 100
            },
            quantity: 1, // es 1 por defecto
          };
        })
      );

      const session = await stripe.checkout.sessions.create({ //Crea una sesión de pago con Stripe Checkout.
        shipping_address_collection: { allowed_countries: ["ES"] }, //restringe los países de envío a España ("ES")
        payment_method_types: ["card"], //Se permiten pagos con tarjeta
        mode: "payment",
        success_url: process.env.CLIENT_URL + "/success", //URLs de redirección después del pago 
        cancel_url: process.env.CLIENT_URL + "/sucessError", //URLs de redirección después del pago
        line_items: lineItems,
      });

      //Guarda la orden en Strapi, incluyendo los productos y el ID de la sesión de Stripe
      await strapi.service("api::order.order").create({
        data: { products, stripeId: session.id },
      });

      return { stripeSession: session }; //Devuelve al frontend la sesión de Stripe(contiene la informacion (lineas 58-64))
    } catch (error) {
      console.error("🔥 Error al crear la orden:", error);
      ctx.response.status = 500;
      return { error: error.message || "Error interno del servidor" };
    }
  },
}));
