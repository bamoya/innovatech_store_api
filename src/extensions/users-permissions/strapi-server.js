module.exports = (plugin) => {
  // custom controller
  plugin.controllers.user.updateMe = async (ctx) => {
    if (!ctx.state.user || !ctx.state.user.id) {
      return (ctx.response.status = 401);
    }

    const { email, username } = ctx.request.body;

    const userWithEmail = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { email: email } });
    const userWithUsername = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { username: username },
      });

    if (userWithEmail && userWithEmail.id !== ctx.state.user.id) {
      return ctx.badRequest("Email already taken");
    }
    if (userWithUsername && userWithUsername.id !== ctx.state.user.id) {
      return ctx.badRequest("Username already taken");
    }

    await strapi
      .query("plugin::users-permissions.user")
      .update({
        where: { id: ctx.state.user.id },
        data: ctx.request.body,
      })
      .then((res) => {
        ctx.response.status = 200;
      })
      .catch((err) => {
        ctx.response.status = 400;
      });

    // const user = await strapi.query("plugin::users-permissions.user").findOne({
    //   where: { id: ctx.state.user.id },
    // });
    // return user;
  };

  // custom route
  plugin.routes["content-api"].routes.push({
    method: "PUT",
    path: "/user/me",
    handler: "user.updateMe",
    config: {
      prefix: "",
      policies: [],
    },
  });

  return plugin;
};
