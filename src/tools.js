import * as shopify from './shopify.js';

export const toolDefinitions = [
  {
    name: 'get_product_filters',
    description: 'Obtiene los tags/filtros disponibles para una categoría de productos. Úsalo PRIMERO cuando el cliente busque un tipo de producto (ej: leggings, camisetas) para conocer las subcategorías disponibles y poder hacer preguntas de filtrado antes de mostrar productos concretos.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Tipo de producto a explorar (ej: leggings, camiseta, pantalón)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_products',
    description: 'Busca productos concretos. Úsalo DESPUÉS de haber depurado la búsqueda con get_product_filters y preguntas al cliente. Incluye los filtros elegidos en el query.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Término de búsqueda (nombre del producto, categoría, etc.)',
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados (default: 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_product',
    description: 'Obtiene detalles completos de un producto específico: variantes, precios, stock, imágenes.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: {
          type: 'number',
          description: 'ID numérico del producto en Shopify',
        },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'get_collections',
    description: 'Lista todas las colecciones/categorías de la tienda.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de colecciones a retornar',
        },
      },
    },
  },
  {
    name: 'get_products_by_collection',
    description: 'Obtiene los productos de una colección específica. Útil para mostrar productos relacionados o de la misma categoría.',
    input_schema: {
      type: 'object',
      properties: {
        collection_id: {
          type: 'number',
          description: 'ID de la colección',
        },
        limit: {
          type: 'number',
          description: 'Número máximo de productos',
        },
      },
      required: ['collection_id'],
    },
  },
  {
    name: 'check_inventory',
    description: 'Verifica el stock disponible de uno o varios items de inventario.',
    input_schema: {
      type: 'object',
      properties: {
        inventory_item_ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'Lista de IDs de inventory_item de las variantes del producto',
        },
      },
      required: ['inventory_item_ids'],
    },
  },
  {
    name: 'get_orders_by_customer',
    description: 'Obtiene el historial de pedidos de un cliente. Úsalo cuando el cliente pregunte por sus pedidos o quiera rastrear un envío.',
    input_schema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'number',
          description: 'ID del cliente en Shopify',
        },
        limit: {
          type: 'number',
          description: 'Número de pedidos más recientes a retornar (default: 5)',
        },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'get_order',
    description: 'Obtiene los detalles completos de un pedido específico incluyendo estado de envío y tracking.',
    input_schema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'number',
          description: 'ID del pedido en Shopify',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'create_order',
    description: 'Crea un nuevo pedido para un cliente. Úsalo cuando el cliente quiera comprar un producto directamente desde el chat.',
    input_schema: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'number',
          description: 'ID del cliente',
        },
        line_items: {
          type: 'array',
          description: 'Lista de productos a comprar',
          items: {
            type: 'object',
            properties: {
              variant_id: { type: 'number', description: 'ID de la variante del producto' },
              quantity: { type: 'number', description: 'Cantidad a comprar' },
            },
            required: ['variant_id', 'quantity'],
          },
        },
        note: {
          type: 'string',
          description: 'Nota opcional para el pedido',
        },
      },
      required: ['customer_id', 'line_items'],
    },
  },
  {
    name: 'search_customers',
    description: 'Busca un cliente por nombre, email o teléfono para obtener su ID y datos.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Email, nombre o teléfono del cliente',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_discounts',
    description: 'Lista los descuentos y promociones activas en la tienda.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de descuentos a retornar',
        },
      },
    },
  },
  {
    name: 'validate_discount_code',
    description: 'Valida si un código de descuento existe y está activo.',
    input_schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'El código de descuento a validar',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'get_checkout',
    description: 'Obtiene el estado de un checkout específico.',
    input_schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Token del checkout',
        },
      },
      required: ['token'],
    },
  },
];

export async function executeTool(name, input) {
  switch (name) {
    case 'get_product_filters':       return shopify.getProductFilters(input);
    case 'search_products':           return shopify.searchProducts(input);
    case 'get_product':               return shopify.getProduct(input);
    case 'get_collections':           return shopify.getCollections(input);
    case 'get_products_by_collection':return shopify.getProductsByCollection(input);
    case 'check_inventory':           return shopify.checkInventory(input);
    case 'get_orders_by_customer':    return shopify.getOrdersByCustomer(input);
    case 'get_order':                 return shopify.getOrder(input);
    case 'create_order':              return shopify.createOrder(input);
    case 'search_customers':          return shopify.searchCustomers(input);
    case 'get_discounts':             return shopify.getDiscounts(input);
    case 'validate_discount_code':    return shopify.validateDiscountCode(input);
    case 'get_checkout':              return shopify.getCheckout(input);
    default:
      throw new Error(`Tool desconocido: ${name}`);
  }
}
