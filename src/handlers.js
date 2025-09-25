// handlers.js
const { 
    handleMenuPrincipal,
    handleSubmenuAparelho,
    handleSubmenuSmartTV,
    handleSubmenuCelular,
    handleSubmenuTeste
} = require('./menus');

module.exports = {
    menu_principal: handleMenuPrincipal,
    submenu_aparelho: handleSubmenuAparelho,
    submenu_smarttv: handleSubmenuSmartTV,
    submenu_celular: handleSubmenuCelular,
    submenu_teste: handleSubmenuTeste
};
