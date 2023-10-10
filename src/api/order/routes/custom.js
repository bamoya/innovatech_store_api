"use-strict";

module.exports = {
  routes: [
    {
      method: "PUT",
      path: "/order/confirm",
      handler: "order.confirm",
      config: {
        auth: false,
      },
    },
  ],
};
