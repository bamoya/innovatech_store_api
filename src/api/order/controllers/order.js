"use strict";
// @ts-ignore
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  /**
   * create an order
   * @param {any} ctx
   */
  async create(ctx) {
    const { products, total } = ctx.request.body;
    const user = ctx.state.user;
    console.log(user);

    if (products.length === 0) {
      return ctx.throw(400, "Please specify a product");
    }

    if (!user) {
      return ctx.throw(400, "No user specified");
    }

    const realProducts = [];

    try {
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::product.product")
            .findOne(product.id);
          realProducts.push(item);

          return {
            price_data: {
              currency: "mad",
              product_data: {
                name: item.title,
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: product.quantity,
          };
        })
      );

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        success_url:
          process.env.CLIENT_URL +
          "shop/checkout/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: process.env.CLIENT_URL + "",
        line_items: lineItems,
      });

      await strapi.service("api::order.order").create({
        data: {
          products: realProducts,
          checkout_session: session.id,
          user: user,
          status: "unpaid",
          total: total,
        },
      });

      return { stripeSession: session };
    } catch (error) {
      ctx.response.status = 500;
      return { error };
    }
  },

  async confirm(ctx) {
    const { checkout_session } = ctx.request.body;

    if (checkout_session) {
      const stripeSession = await stripe.checkout.sessions.retrieve(
        checkout_session
      );
      console.log(stripeSession);
      if (stripeSession.payment_status === "paid") {
        const updatedOrder = await strapi.query("api::order.order").update({
          where: { checkout_session: checkout_session },
          data: { status: "paid" },
        });
        if (!updatedOrder) {
          return ctx.throw("Payment failed please call the support", 400);
        }
        return (ctx.status = 200);
      }

      return ctx.throw("Payment failed please call the support", 400);
    } else {
      return ctx.throw("Please set the session id", 400);
    }
  },
}));
