/**
 * storeTemplates.js — Dados de nicho para população automática de lojas.
 *
 * Cada template define:
 *   - categories: lista de categorias com ordem
 *   - products: lista de produtos com preço, descrição e termo de busca no Pexels
 *
 * Nicho → categoryKey → categoria da loja
 * pexelsQuery: termo em inglês (Pexels tem resultados melhores em inglês)
 */

// ─────────────────────────────────────────────────────────────────────────────
// FOOD
// ─────────────────────────────────────────────────────────────────────────────

const PIZZARIA = {
  type: 'food',
  categories: [
    { key: 'pizzas',     name: 'Pizzas',     order: 0 },
    { key: 'bebidas',    name: 'Bebidas',    order: 1 },
    { key: 'combos',     name: 'Combos',     order: 2 },
    { key: 'sobremesas', name: 'Sobremesas', order: 3 },
  ],
  products: [
    // Pizzas
    { category: 'pizzas',     name: 'Pizza Calabresa',           price: 42.90, description: 'Calabresa fatiada, cebola e azeitona no molho artesanal.',         pexelsQuery: 'calabresa pizza slice close up' },
    { category: 'pizzas',     name: 'Pizza Portuguesa',          price: 44.90, description: 'Presunto, ovo, cebola, azeitona e mussarela.',                      pexelsQuery: 'portuguese pizza traditional toppings' },
    { category: 'pizzas',     name: 'Pizza Frango Catupiry',     price: 46.90, description: 'Frango desfiado com requeijão cremoso Catupiry.',                   pexelsQuery: 'chicken cream cheese pizza' },
    { category: 'pizzas',     name: 'Pizza Margherita',          price: 39.90, description: 'Molho de tomate, mussarela fresca e manjericão.',                   pexelsQuery: 'margherita pizza fresh basil' },
    { category: 'pizzas',     name: 'Pizza Quatro Queijos',      price: 47.90, description: 'Mussarela, provolone, parmesão e gorgonzola.',                      pexelsQuery: 'four cheese pizza melted' },
    { category: 'pizzas',     name: 'Pizza Pepperoni',           price: 48.90, description: 'Pepperoni importado com mussarela cremosa.',                        pexelsQuery: 'pepperoni pizza close up appetizing' },
    { category: 'pizzas',     name: 'Pizza Napolitana',          price: 41.90, description: 'Tomate, anchovas, alcaparras e azeitona preta.',                    pexelsQuery: 'neapolitan pizza rustic italian' },
    { category: 'pizzas',     name: 'Pizza Atum',                price: 43.90, description: 'Atum ao molho de tomate com cebola roxa e azeitona.',               pexelsQuery: 'tuna pizza seafood' },
    { category: 'pizzas',     name: 'Pizza Milho com Bacon',     price: 40.90, description: 'Milho verde, bacon crocante e catupiry.',                           pexelsQuery: 'corn bacon pizza golden' },
    { category: 'pizzas',     name: 'Pizza Vegetariana',         price: 41.90, description: 'Abobrinha, berinjela, pimentão e tomate seco.',                     pexelsQuery: 'vegetarian pizza colorful vegetables' },
    // Bebidas
    { category: 'bebidas',    name: 'Coca Cola 2L',              price: 12.90, description: 'Garrafa 2 litros gelada.',                                          pexelsQuery: 'coca cola bottle cold drink' },
    { category: 'bebidas',    name: 'Guaraná Antarctica Lata',   price:  7.90, description: 'Lata 350ml refrescante.',                                           pexelsQuery: 'guarana soda can cold' },
    { category: 'bebidas',    name: 'Suco de Laranja Natural',   price:  8.90, description: 'Laranja fresca espremida na hora, 400ml.',                          pexelsQuery: 'fresh squeezed orange juice glass' },
    { category: 'bebidas',    name: 'Água Mineral 500ml',        price:  4.90, description: 'Água mineral natural sem gás.',                                     pexelsQuery: 'mineral water bottle clear' },
    { category: 'bebidas',    name: 'Cerveja Heineken Long Neck',price:  9.90, description: 'Long neck 330ml, gelada.',                                          pexelsQuery: 'heineken beer bottle cold' },
    // Combos
    { category: 'combos',     name: 'Combo Pizza + Refrigerante',price: 52.90, description: 'Pizza grande + 1 refrigerante 2L.',                                pexelsQuery: 'pizza and soda combo meal' },
    { category: 'combos',     name: 'Combo 2 Pizzas Médias',     price: 79.90, description: 'Escolha 2 pizzas médias de qualquer sabor.',                        pexelsQuery: 'two pizzas family meal' },
    { category: 'combos',     name: 'Combo Família',             price:109.90, description: '2 pizzas grandes + 2 refrigerantes 2L.',                            pexelsQuery: 'family pizza dinner table' },
    // Sobremesas
    { category: 'sobremesas', name: 'Brownie de Chocolate',      price: 14.90, description: 'Brownie quente com sorvete de baunilha.',                           pexelsQuery: 'chocolate brownie warm dessert' },
    { category: 'sobremesas', name: 'Petit Gateau',              price: 16.90, description: 'Bolinho de chocolate com centro quente e sorvete.',                 pexelsQuery: 'petit gateau chocolate lava cake' },
    { category: 'sobremesas', name: 'Sorvete Napolitano',        price: 18.90, description: 'Pote 500ml com sabores creme, chocolate e morango.',                pexelsQuery: 'neapolitan ice cream scoops' },
    { category: 'sobremesas', name: 'Pudim de Leite',            price: 11.90, description: 'Pudim cremoso com calda de caramelo.',                              pexelsQuery: 'caramel pudding dessert' },
  ],
};

const HAMBURGUERIA = {
  type: 'food',
  categories: [
    { key: 'hamburgueres',   name: 'Hambúrgueres',   order: 0 },
    { key: 'bebidas',        name: 'Bebidas',        order: 1 },
    { key: 'combos',         name: 'Combos',         order: 2 },
    { key: 'acompanhamentos',name: 'Acompanhamentos',order: 3 },
  ],
  products: [
    // Hambúrgueres
    { category: 'hamburgueres',    name: 'Classic Burger',           price: 28.90, description: 'Blend 180g, queijo prato, alface, tomate e maionese artesanal.',  pexelsQuery: 'classic hamburger close up food' },
    { category: 'hamburgueres',    name: 'Bacon Burger',             price: 32.90, description: 'Blend 180g, bacon crocante, cheddar e molho barbecue.',            pexelsQuery: 'bacon cheeseburger smash' },
    { category: 'hamburgueres',    name: 'Double Smash Burger',      price: 38.90, description: 'Dois blends 90g smashados, duplo cheddar e pickles.',              pexelsQuery: 'double smash burger dripping cheese' },
    { category: 'hamburgueres',    name: 'Cheeseburger Artesanal',   price: 29.90, description: 'Blend 160g com três queijos e cebola caramelizada.',               pexelsQuery: 'artisan cheeseburger gourmet' },
    { category: 'hamburgueres',    name: 'BBQ Burger',               price: 34.90, description: 'Blend 180g, onion rings, barbecue e cheddar cremoso.',             pexelsQuery: 'bbq burger onion rings' },
    { category: 'hamburgueres',    name: 'Mushroom Burger',          price: 33.90, description: 'Cogumelos refogados, queijo suíço e molho especial.',              pexelsQuery: 'mushroom burger swiss cheese' },
    { category: 'hamburgueres',    name: 'Chicken Crispy Burger',    price: 27.90, description: 'Frango empanado crocante, coleslaw e mostarda mel.',               pexelsQuery: 'crispy chicken sandwich burger' },
    { category: 'hamburgueres',    name: 'Veggie Burger',            price: 26.90, description: 'Blend de grão-de-bico, queijo e vegetais frescos.',                pexelsQuery: 'veggie burger plant based' },
    // Bebidas
    { category: 'bebidas',         name: 'Milkshake de Chocolate',   price: 16.90, description: 'Milkshake cremoso 400ml com calda de chocolate.',                 pexelsQuery: 'chocolate milkshake thick straw' },
    { category: 'bebidas',         name: 'Milkshake de Baunilha',    price: 16.90, description: 'Milkshake de baunilha 400ml com chantilly.',                       pexelsQuery: 'vanilla milkshake creamy' },
    { category: 'bebidas',         name: 'Refrigerante Lata',        price:  6.90, description: 'Coca, Pepsi ou Guaraná 350ml.',                                   pexelsQuery: 'soda can cold drink' },
    { category: 'bebidas',         name: 'Suco de Uva',              price:  8.90, description: 'Suco de uva integral 300ml.',                                     pexelsQuery: 'grape juice glass purple' },
    { category: 'bebidas',         name: 'Limonada Suíça',           price: 12.90, description: 'Limonada cremosa com leite condensado, 400ml.',                   pexelsQuery: 'lemonade refreshing glass citrus' },
    // Combos
    { category: 'combos',          name: 'Combo Classic',            price: 39.90, description: 'Classic Burger + Batata Frita + Refrigerante.',                   pexelsQuery: 'burger fries combo meal' },
    { category: 'combos',          name: 'Combo Double',             price: 48.90, description: 'Double Smash + Batata Frita + Milkshake.',                        pexelsQuery: 'double burger combo' },
    { category: 'combos',          name: 'Combo Família',            price: 69.90, description: '2 Burgers + 2 Batatas Fritas + 2 Refrigerantes.',                 pexelsQuery: 'family burger meal table' },
    { category: 'combos',          name: 'Combo Infantil',           price: 32.90, description: 'Mini Burger + Batata Palito + Suco + Brinquedo.',                 pexelsQuery: 'kids meal burger small' },
    // Acompanhamentos
    { category: 'acompanhamentos', name: 'Batata Frita Crocante',    price: 14.90, description: 'Batata palito crocante com sal temperado, porção 200g.',          pexelsQuery: 'crispy french fries golden' },
    { category: 'acompanhamentos', name: 'Onion Rings',              price: 13.90, description: 'Anéis de cebola empanados crocantes, 8 unidades.',                pexelsQuery: 'onion rings crispy golden' },
    { category: 'acompanhamentos', name: 'Salada Caesar',            price: 12.90, description: 'Alface romana, croutons, parmesão e molho caesar.',               pexelsQuery: 'caesar salad fresh restaurant' },
    { category: 'acompanhamentos', name: 'Batata Doce Frita',        price: 15.90, description: 'Batata doce fatiada e frita, com mel e canela.',                  pexelsQuery: 'sweet potato fries healthy' },
    { category: 'acompanhamentos', name: 'Fritas com Cheddar',       price: 17.90, description: 'Batata frita coberta com cheddar cremoso e bacon.',               pexelsQuery: 'loaded fries cheese sauce' },
  ],
};

const ACAI = {
  type: 'food',
  categories: [
    { key: 'acai',         name: 'Açaí',         order: 0 },
    { key: 'complementos', name: 'Complementos', order: 1 },
    { key: 'bebidas',      name: 'Bebidas',      order: 2 },
    { key: 'combos',       name: 'Combos',       order: 3 },
  ],
  products: [
    // Açaí
    { category: 'acai',         name: 'Açaí 300ml',                 price: 14.90, description: 'Açaí puro cremoso 300ml.',                                          pexelsQuery: 'acai bowl purple superfood' },
    { category: 'acai',         name: 'Açaí 500ml',                 price: 22.90, description: 'Açaí puro cremoso 500ml.',                                          pexelsQuery: 'acai bowl large toppings' },
    { category: 'acai',         name: 'Açaí 700ml',                 price: 29.90, description: 'Açaí puro cremoso 700ml.',                                          pexelsQuery: 'acai smoothie bowl big' },
    { category: 'acai',         name: 'Açaí Tigela Pequena',        price: 18.90, description: 'Tigela pequena de açaí com granola e banana.',                      pexelsQuery: 'acai bowl granola banana' },
    { category: 'acai',         name: 'Açaí Tigela Grande',         price: 26.90, description: 'Tigela grande de açaí com granola, banana e morango.',              pexelsQuery: 'acai bowl strawberry topping' },
    { category: 'acai',         name: 'Açaí Premium',               price: 28.90, description: 'Açaí com granola premium, mel, leite condensado e frutas.',         pexelsQuery: 'premium acai bowl colorful' },
    // Complementos
    { category: 'complementos', name: 'Granola',                    price:  3.00, description: 'Granola crocante artesanal.',                                       pexelsQuery: 'granola oats nuts healthy' },
    { category: 'complementos', name: 'Leite em Pó',                price:  2.00, description: 'Leite em pó integral.',                                            pexelsQuery: 'milk powder food ingredient' },
    { category: 'complementos', name: 'Paçoca',                     price:  2.50, description: 'Paçoca de amendoim esfarelada.',                                   pexelsQuery: 'peanut candy crumbled' },
    { category: 'complementos', name: 'Mel',                        price:  3.00, description: 'Mel de abelha puro.',                                              pexelsQuery: 'honey drizzle golden' },
    { category: 'complementos', name: 'Morango',                    price:  4.00, description: 'Morangos frescos fatiados.',                                       pexelsQuery: 'fresh strawberries sliced red' },
    { category: 'complementos', name: 'Banana Fatiada',             price:  2.50, description: 'Banana prata fatiada.',                                            pexelsQuery: 'banana sliced yellow fruit' },
    { category: 'complementos', name: 'Leite Condensado',           price:  3.50, description: 'Leite condensado cremoso.',                                        pexelsQuery: 'condensed milk sweet pouring' },
    { category: 'complementos', name: 'Nutella 30g',                price:  5.00, description: 'Dose de Nutella original.',                                        pexelsQuery: 'nutella chocolate hazelnut spread' },
    // Bebidas
    { category: 'bebidas',      name: 'Água de Coco Natural',       price:  9.90, description: 'Água de coco fresca 300ml.',                                       pexelsQuery: 'coconut water glass tropical' },
    { category: 'bebidas',      name: 'Vitamina de Açaí',           price: 16.90, description: 'Vitamina de açaí com banana e leite de coco 400ml.',               pexelsQuery: 'acai smoothie purple drink' },
    { category: 'bebidas',      name: 'Smoothie Tropical',          price: 14.90, description: 'Smoothie de manga, abacaxi e maracujá 400ml.',                     pexelsQuery: 'tropical smoothie colorful glass' },
    { category: 'bebidas',      name: 'Suco Verde Detox',           price: 12.90, description: 'Limão, couve, gengibre e pepino 350ml.',                           pexelsQuery: 'green detox juice healthy' },
    // Combos
    { category: 'combos',       name: 'Combo Duplo Açaí',           price: 44.90, description: '2 Açaís 500ml com complementos à escolha.',                        pexelsQuery: 'two acai bowls couple' },
    { category: 'combos',       name: 'Combo Família',              price: 79.90, description: '4 Açaís 500ml com complementos.',                                  pexelsQuery: 'family acai bowls table' },
    { category: 'combos',       name: 'Kit Lanche Açaí',            price: 32.90, description: 'Açaí 500ml + Vitamina + Complemento.',                             pexelsQuery: 'acai snack combo healthy' },
    { category: 'combos',       name: 'Combo Power',                price: 38.90, description: 'Açaí 700ml + Whey + Granola + Mel.',                               pexelsQuery: 'fitness acai bowl protein' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SORVETERIA
// ─────────────────────────────────────────────────────────────────────────────

const SORVETERIA = {
  type: 'food',
  categories: [
    { key: 'sorvetes',   name: 'Sorvetes',   order: 0 },
    { key: 'acai',       name: 'Açaí',       order: 1 },
    { key: 'milkshakes', name: 'Milkshakes', order: 2 },
    { key: 'combos',     name: 'Combos',     order: 3 },
  ],
  products: [
    // Sorvetes
    { category: 'sorvetes',   name: 'Casquinha Simples',        price:  6.90, description: '1 bola de sorvete em casquinha crocante.',                   pexelsQuery: 'ice cream cone single scoop' },
    { category: 'sorvetes',   name: 'Casquinha Dupla',          price: 10.90, description: '2 bolas de sorvete em casquinha crocante.',                  pexelsQuery: 'double scoop ice cream cone' },
    { category: 'sorvetes',   name: 'Sundae de Chocolate',      price: 14.90, description: 'Sorvete de creme com calda de chocolate e chantilly.',        pexelsQuery: 'chocolate sundae ice cream dessert' },
    { category: 'sorvetes',   name: 'Sundae de Morango',        price: 14.90, description: 'Sorvete de creme com calda de morango e chantilly.',          pexelsQuery: 'strawberry sundae ice cream' },
    { category: 'sorvetes',   name: 'Taça 3 Bolas',             price: 18.90, description: 'Escolha 3 sabores com cobertura à escolha.',                 pexelsQuery: 'three scoop ice cream bowl' },
    { category: 'sorvetes',   name: 'Sorvete no Pote 500ml',    price: 24.90, description: 'Pote 500ml no sabor à escolha.',                             pexelsQuery: 'ice cream pint container' },
    { category: 'sorvetes',   name: 'Sorvete no Pote 1L',       price: 42.90, description: 'Pote 1L, ideal para compartilhar.',                          pexelsQuery: 'ice cream large container family' },
    // Açaí
    { category: 'acai',       name: 'Açaí 300ml',               price: 14.90, description: 'Açaí cremoso 300ml com granola e banana.',                   pexelsQuery: 'acai bowl purple toppings' },
    { category: 'acai',       name: 'Açaí 500ml',               price: 22.90, description: 'Açaí cremoso 500ml com granola, banana e morango.',          pexelsQuery: 'acai bowl large granola' },
    { category: 'acai',       name: 'Açaí Premium 700ml',       price: 30.90, description: 'Açaí premium com mel, leite condensado e frutas da época.',  pexelsQuery: 'premium acai bowl colorful' },
    // Milkshakes
    { category: 'milkshakes', name: 'Milkshake de Chocolate',   price: 16.90, description: 'Milkshake cremoso 400ml com calda de chocolate.',            pexelsQuery: 'chocolate milkshake thick straw' },
    { category: 'milkshakes', name: 'Milkshake de Morango',     price: 16.90, description: 'Milkshake 400ml com morangos frescos.',                      pexelsQuery: 'strawberry milkshake pink glass' },
    { category: 'milkshakes', name: 'Milkshake de Baunilha',    price: 15.90, description: 'Milkshake cremoso de baunilha 400ml.',                       pexelsQuery: 'vanilla milkshake creamy' },
    { category: 'milkshakes', name: 'Milkshake Oreo',           price: 18.90, description: 'Milkshake com biscoitos Oreo triturados e chantilly.',       pexelsQuery: 'oreo milkshake cookies cream' },
    // Combos
    { category: 'combos',     name: 'Combo Casal',              price: 34.90, description: '2 Taças 3 Bolas + 2 Milkshakes.',                           pexelsQuery: 'couple ice cream desserts table' },
    { category: 'combos',     name: 'Combo Família',            price: 59.90, description: '4 Casquinhas Duplas + 2 Milkshakes.',                        pexelsQuery: 'family ice cream dessert' },
    { category: 'combos',     name: 'Combo Sorvete + Açaí',     price: 36.90, description: 'Taça 3 Bolas + Açaí 500ml.',                                pexelsQuery: 'ice cream acai bowl combo' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// FARMÁCIA
// ─────────────────────────────────────────────────────────────────────────────

const FARMACIA = {
  type: 'pharmacy',
  categories: [
    { key: 'dor',      name: 'Dor e Febre',  order: 0 },
    { key: 'vitaminas',name: 'Vitaminas',    order: 1 },
    { key: 'higiene',  name: 'Higiene',      order: 2 },
    { key: 'bebe',     name: 'Bebê',         order: 3 },
  ],
  products: [
    // Dor e Febre
    { category: 'dor',       name: 'Dipirona 500mg 10cp',            price:  8.90, description: 'Analgésico e antitérmico de rápida ação.',                         pexelsQuery: 'medicine pills pharmacy painkiller',    requiresPrescription: false },
    { category: 'dor',       name: 'Ibuprofeno 600mg',               price: 12.50, description: 'Anti-inflamatório e analgésico 20 comprimidos.',                   pexelsQuery: 'ibuprofen tablets medicine box',          requiresPrescription: false },
    { category: 'dor',       name: 'Paracetamol 750mg',              price:  7.90, description: 'Analgésico e antitérmico 20 comprimidos.',                         pexelsQuery: 'paracetamol tablets white pills',         requiresPrescription: false },
    { category: 'dor',       name: 'Aspirina 500mg',                 price:  9.90, description: 'Ácido acetilsalicílico, 20 comprimidos efervescentes.',             pexelsQuery: 'aspirin effervescent tablets water',      requiresPrescription: false },
    { category: 'dor',       name: 'Buscopan 10mg',                  price: 14.90, description: 'Antiespasmódico para cólicas, 20 comprimidos.',                    pexelsQuery: 'stomach medicine capsules healthcare',    requiresPrescription: false },
    { category: 'dor',       name: 'Nimesulida 100mg',               price: 11.90, description: 'Anti-inflamatório — requer receita médica.',                       pexelsQuery: 'anti inflammatory medicine prescription', requiresPrescription: true  },
    { category: 'dor',       name: 'Voltaren Gel 40g',               price: 28.90, description: 'Gel anti-inflamatório para uso tópico.',                           pexelsQuery: 'pain relief gel tube pharmacy',           requiresPrescription: false },
    { category: 'dor',       name: 'Tylenol Sinus',                  price: 16.50, description: 'Alívio de sinusite e dor de cabeça, 24 comprimidos.',              pexelsQuery: 'headache medicine blister pack',          requiresPrescription: false },
    // Vitaminas
    { category: 'vitaminas', name: 'Vitamina C 1g Efervescente',     price: 18.90, description: '10 comprimidos efervescentes sabor laranja.',                      pexelsQuery: 'vitamin c effervescent tablet orange',    requiresPrescription: false },
    { category: 'vitaminas', name: 'Vitamina D3 2000UI',             price: 24.90, description: '60 cápsulas — imunidade e saúde óssea.',                           pexelsQuery: 'vitamin d supplement capsules sunshine',  requiresPrescription: false },
    { category: 'vitaminas', name: 'Ômega 3 60 cápsulas',            price: 32.90, description: 'EPA + DHA para saúde cardiovascular.',                             pexelsQuery: 'omega 3 fish oil capsules health',        requiresPrescription: false },
    { category: 'vitaminas', name: 'Complexo B 60cp',                price: 19.90, description: 'Todas as vitaminas do complexo B, 60 comprimidos.',                pexelsQuery: 'vitamin b complex supplement yellow',     requiresPrescription: false },
    { category: 'vitaminas', name: 'Magnésio + B6',                  price: 26.90, description: 'Relaxamento muscular e redução do estresse.',                      pexelsQuery: 'magnesium supplement bottle healthcare',  requiresPrescription: false },
    { category: 'vitaminas', name: 'Zinco 30mg',                     price: 21.90, description: '60 comprimidos — imunidade e pele saudável.',                      pexelsQuery: 'zinc supplement tablets immunity',        requiresPrescription: false },
    { category: 'vitaminas', name: 'Multivitamínico A-Z',            price: 34.90, description: 'Fórmula completa com 23 vitaminas e minerais, 60cp.',              pexelsQuery: 'multivitamin colorful pills supplement',  requiresPrescription: false },
    { category: 'vitaminas', name: 'Colágeno + Vitamina C',          price: 38.90, description: 'Colágeno hidrolisado + Vit. C para pele e articulações.',          pexelsQuery: 'collagen supplement beauty skin health',  requiresPrescription: false },
    // Higiene
    { category: 'higiene',   name: 'Shampoo Anticaspa 400ml',        price: 16.90, description: 'Controla caspa e oleosidade.',                                     pexelsQuery: 'shampoo bottle hair care' },
    { category: 'higiene',   name: 'Protetor Solar FPS 50 120ml',    price: 42.90, description: 'Proteção UVA+UVB para uso diário.',                                pexelsQuery: 'sunscreen sunblock protection beach' },
    { category: 'higiene',   name: 'Creme Hidratante Corporal 200g', price: 24.90, description: 'Hidratação profunda 24h para a pele.',                             pexelsQuery: 'body lotion moisturizer skincare' },
    { category: 'higiene',   name: 'Antisséptico Bucal 500ml',       price: 13.90, description: 'Listerine menta — proteção completa 12h.',                        pexelsQuery: 'mouthwash bottle dental hygiene' },
    { category: 'higiene',   name: 'Fio Dental 50m',                 price:  8.90, description: 'Fio dental encerado sabor menta.',                                 pexelsQuery: 'dental floss oral care hygiene' },
    { category: 'higiene',   name: 'Pasta de Dentes Branqueadora',   price: 12.90, description: 'Clareamento e proteção contra cáries, 90g.',                      pexelsQuery: 'whitening toothpaste tube dental' },
    { category: 'higiene',   name: 'Desodorante Roll-On 50ml',       price: 14.90, description: 'Proteção 48h antitranspirante.',                                   pexelsQuery: 'deodorant roll on personal care' },
    { category: 'higiene',   name: 'Sabonete Antibacteriano 90g',    price:  6.90, description: 'Elimina 99,9% das bactérias.',                                     pexelsQuery: 'antibacterial soap bar hygiene' },
    // Bebê
    { category: 'bebe',      name: 'Fralda Pampers M c/30',          price: 49.90, description: 'Fraldas descartáveis tamanho M, 30 unidades.',                     pexelsQuery: 'baby diapers pampers product' },
    { category: 'bebe',      name: 'Lenços Umedecidos 80 un',        price: 12.90, description: 'Lenços com aloe vera sem álcool.',                                 pexelsQuery: 'baby wipes clean gentle' },
    { category: 'bebe',      name: 'Pomada para Assaduras 45g',      price: 18.90, description: 'Prevenção e tratamento de assaduras.',                             pexelsQuery: 'diaper rash cream baby care' },
    { category: 'bebe',      name: 'Shampoo Johnson\'s Baby 200ml',  price: 19.90, description: 'Shampoo suave sem lágrimas.',                                     pexelsQuery: 'baby shampoo gentle formula' },
    { category: 'bebe',      name: 'Soro Fisiológico Baby 10un',     price:  8.90, description: 'Soro para higiene nasal, 10 ampolas 5ml.',                         pexelsQuery: 'saline solution baby nasal drops' },
    { category: 'bebe',      name: 'Termômetro Digital',             price: 34.90, description: 'Termômetro axilar com alarme de febre.',                           pexelsQuery: 'digital thermometer baby temperature' },
    { category: 'bebe',      name: 'Mamadeira Anti-Cólica 240ml',    price: 44.90, description: 'Sistema anti-cólica bico fisiológico.',                            pexelsQuery: 'baby bottle anti colic feeding' },
    { category: 'bebe',      name: 'Chupeta Ortodôntica',            price: 19.90, description: 'Chupeta silicone ortodôntica 0-6 meses.',                          pexelsQuery: 'baby pacifier orthodontic silicone' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

export const STORE_TEMPLATES = {
  pizzaria:     PIZZARIA,
  hamburgueria: HAMBURGUERIA,
  acai:         ACAI,
  sorveteria:   SORVETERIA,
  farmacia:     FARMACIA,
};

// ── Mapeamento de nichos por produto ─────────────────────────────────────────

/** Nichos permitidos para usuários PedeZap (delivery food) */
export const PEDEZAP_NICHES = ['pizzaria', 'hamburgueria', 'acai', 'sorveteria'];

/** Nichos permitidos para usuários FarmaZap */
export const FARMAZAP_NICHES = ['farmacia'];

/** Mapa type → niches para validação no storeFactory */
export const NICHES_BY_TYPE = {
  pedezap:  PEDEZAP_NICHES,
  farmazap: FARMAZAP_NICHES,
};

/**
 * Retorna o template para um nicho.
 * @param {string} niche — "pizzaria" | "hamburgueria" | "acai" | "farmacia"
 * @returns {{ type, categories, products }}
 */
export function getTemplate(niche) {
  const key = niche.toLowerCase().trim();
  const template = STORE_TEMPLATES[key];
  if (!template) {
    throw Object.assign(
      new Error(`Nicho não suportado: "${niche}". Use: ${Object.keys(STORE_TEMPLATES).join(', ')}`),
      { statusCode: 400 }
    );
  }
  return template;
}

export const SUPPORTED_NICHES = Object.keys(STORE_TEMPLATES);
