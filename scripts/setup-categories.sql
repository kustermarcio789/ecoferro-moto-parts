-- ═══════════════════════════════════════════════════════════════
-- Criar classes (categorias pai) e subclasses (filhas)
-- para o catálogo da EcoFerro, e auto-categorizar todos os produtos
-- ═══════════════════════════════════════════════════════════════

-- 1. Limpar categorias existentes (se houver)
UPDATE public.products SET category_id = NULL;
DELETE FROM public.categories;

-- 2. Criar classes principais (parent_id = NULL)
INSERT INTO public.categories (id, name, slug, parent_id, sort_order, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Eliminador de Rabeta',  'eliminador-de-rabeta',  NULL, 1, true),
  ('a0000000-0000-0000-0000-000000000002', 'Suporte de Placa',      'suporte-de-placa',      NULL, 2, true),
  ('a0000000-0000-0000-0000-000000000003', 'Protetor de Radiador',  'protetor-de-radiador',  NULL, 3, true),
  ('a0000000-0000-0000-0000-000000000004', 'Slider e Protetor',     'slider-e-protetor',     NULL, 4, true),
  ('a0000000-0000-0000-0000-000000000005', 'Protetor de Carter',    'protetor-de-carter',    NULL, 5, true),
  ('a0000000-0000-0000-0000-000000000006', 'Bolha e Parabrisa',     'bolha-e-parabrisa',     NULL, 6, true),
  ('a0000000-0000-0000-0000-000000000007', 'Setas e Piscas',        'setas-e-piscas',        NULL, 7, true),
  ('a0000000-0000-0000-0000-000000000008', 'Iluminação',            'iluminacao',             NULL, 8, true),
  ('a0000000-0000-0000-0000-000000000009', 'Acessórios',            'acessorios',             NULL, 9, true);

-- 3. Criar subclasses (filhas)
INSERT INTO public.categories (id, name, slug, parent_id, sort_order, is_active) VALUES
  -- Eliminador de Rabeta
  ('b0000000-0000-0000-0000-000000000001', 'Fixo',        'eliminador-fixo',        'a0000000-0000-0000-0000-000000000001', 1, true),
  ('b0000000-0000-0000-0000-000000000002', 'Articulado',  'eliminador-articulado',  'a0000000-0000-0000-0000-000000000001', 2, true),
  -- Suporte de Placa
  ('b0000000-0000-0000-0000-000000000003', 'Fixo',        'suporte-fixo',           'a0000000-0000-0000-0000-000000000002', 1, true),
  ('b0000000-0000-0000-0000-000000000004', 'Articulado',  'suporte-articulado',     'a0000000-0000-0000-0000-000000000002', 2, true),
  -- Slider e Protetor
  ('b0000000-0000-0000-0000-000000000005', 'Slider de Carenagem',   'slider-carenagem',    'a0000000-0000-0000-0000-000000000004', 1, true),
  ('b0000000-0000-0000-0000-000000000006', 'Slider de Escapamento', 'slider-escapamento',  'a0000000-0000-0000-0000-000000000004', 2, true),
  -- Iluminação
  ('b0000000-0000-0000-0000-000000000007', 'Lanterna LED',   'lanterna-led',    'a0000000-0000-0000-0000-000000000008', 1, true),
  ('b0000000-0000-0000-0000-000000000008', 'Luz de Placa',   'luz-de-placa',    'a0000000-0000-0000-0000-000000000008', 2, true);

-- 4. Auto-categorizar produtos baseado no título
-- Ordem importa: mais específicos primeiro

-- 4a. Suporte de Placa (começa com "Suporte" e contém "Placa")
UPDATE public.products SET category_id = 'a0000000-0000-0000-0000-000000000002'
WHERE lower(name) LIKE 'suporte%placa%' OR lower(name) LIKE 'suporte placa%';

-- Suporte de Placa → Articulado
UPDATE public.products SET category_id = 'b0000000-0000-0000-0000-000000000004'
WHERE category_id = 'a0000000-0000-0000-0000-000000000002'
  AND (lower(name) LIKE '%articulad%' OR lower(name) LIKE '%art.%' OR lower(name) LIKE '%art %');

-- Suporte de Placa → Fixo
UPDATE public.products SET category_id = 'b0000000-0000-0000-0000-000000000003'
WHERE category_id = 'a0000000-0000-0000-0000-000000000002'
  AND lower(name) LIKE '%fixo%';

-- 4b. Eliminador de Rabeta (começa com "Eliminador" ou "Elimiador")
UPDATE public.products SET category_id = 'a0000000-0000-0000-0000-000000000001'
WHERE category_id IS NULL
  AND (lower(name) LIKE 'eliminador%' OR lower(name) LIKE 'elimiador%' OR lower(name) LIKE '%eliminador%rabeta%');

-- Eliminador → Articulado
UPDATE public.products SET category_id = 'b0000000-0000-0000-0000-000000000002'
WHERE category_id = 'a0000000-0000-0000-0000-000000000001'
  AND (lower(name) LIKE '%articulad%' OR lower(name) LIKE '%articu %');

-- Eliminador → Fixo
UPDATE public.products SET category_id = 'b0000000-0000-0000-0000-000000000001'
WHERE category_id = 'a0000000-0000-0000-0000-000000000001'
  AND lower(name) LIKE '%fixo%';

-- 4c. Protetor de Radiador (contém "protetor" e "radiador", mas não começa com Slider/Eliminador)
UPDATE public.products SET category_id = 'a0000000-0000-0000-0000-000000000003'
WHERE category_id IS NULL
  AND lower(name) LIKE '%protetor%radiador%'
  AND lower(name) NOT LIKE 'eliminador%'
  AND lower(name) NOT LIKE 'slider%'
  AND lower(name) NOT LIKE 'suporte%';

-- Também pegar "Tela Protetor Radiador" e "Protetor Radiador"
UPDATE public.products SET category_id = 'a0000000-0000-0000-0000-000000000003'
WHERE category_id IS NULL
  AND (lower(name) LIKE 'protetor radiador%' OR lower(name) LIKE 'protetor de radiador%' OR lower(name) LIKE 'tela protetor%radiador%');

-- 4d. Slider / Protetor de Carenagem
UPDATE public.products SET category_id = 'a0000000-0000-0000-0000-000000000004'
WHERE category_id IS NULL
  AND (lower(name) LIKE 'slider%' OR lower(name) LIKE 'protetor carenagem%');

-- Slider → Escapamento
UPDATE public.products SET category_id = 'b0000000-0000-0000-0000-000000000006'
WHERE category_id = 'a0000000-0000-0000-0000-000000000004'
  AND lower(name) LIKE '%escapamento%'
  AND lower(name) NOT LIKE '%carenag%';

-- Slider → Carenagem (os que contêm carenagem)
UPDATE public.products SET category_id = 'b0000000-0000-0000-0000-000000000005'
WHERE category_id = 'a0000000-0000-0000-0000-000000000004'
  AND lower(name) LIKE '%carenag%';

-- 4e. Protetor de Carter
UPDATE public.products SET category_id = 'a0000000-0000-0000-0000-000000000005'
WHERE category_id IS NULL
  AND (lower(name) LIKE '%protetor%carter%' OR lower(name) LIKE 'grade protetora%carter%');

-- 4f. Bolha / Parabrisa
UPDATE public.products SET category_id = 'a0000000-0000-0000-0000-000000000006'
WHERE category_id IS NULL
  AND (lower(name) LIKE 'bolha%' OR lower(name) LIKE '%parabrisa%');

-- 4g. Setas e Piscas (adaptadores e setas avulsas)
UPDATE public.products SET category_id = 'a0000000-0000-0000-0000-000000000007'
WHERE category_id IS NULL
  AND (lower(name) LIKE '%setas pisca%' OR lower(name) LIKE '%piscas led%'
    OR lower(name) LIKE 'adaptador%pisca%' OR lower(name) LIKE 'adaptador%seta%'
    OR lower(name) LIKE '%adaptadores adaptador%'
    OR lower(name) LIKE '02 setas%' OR lower(name) LIKE '04 setas%'
    OR lower(name) LIKE 'suporte%setas%' OR lower(name) LIKE 'suporte%pisca%'
    OR lower(name) LIKE 'suporte base articulada%pisca%');

-- 4h. Iluminação - Lanterna LED
UPDATE public.products SET category_id = 'b0000000-0000-0000-0000-000000000007'
WHERE category_id IS NULL
  AND (lower(name) LIKE 'lanterna%' OR lower(name) LIKE 'placa eletrônica lanterna%'
    OR lower(name) LIKE 'lente para lanterna%' OR lower(name) LIKE 'lanterna integrada%');

-- Iluminação - Luz de Placa
UPDATE public.products SET category_id = 'b0000000-0000-0000-0000-000000000008'
WHERE category_id IS NULL
  AND (lower(name) LIKE 'luz de placa%' OR lower(name) LIKE 'parafuso%luz%placa%'
    OR lower(name) LIKE 'par parafuso luz%');

-- 4i. Protetor de Farol (poucos itens, vai pra Acessórios ou própria)
UPDATE public.products SET category_id = 'a0000000-0000-0000-0000-000000000009'
WHERE category_id IS NULL
  AND (lower(name) LIKE '%protetor%farol%' OR lower(name) LIKE 'grade protetora%');

-- 4j. Tudo que sobrou → Acessórios
UPDATE public.products SET category_id = 'a0000000-0000-0000-0000-000000000009'
WHERE category_id IS NULL AND is_active = true;

-- 5. Verificar resultado
SELECT c.name as classe, count(p.id) as produtos
FROM public.categories c
LEFT JOIN public.products p ON p.category_id = c.id
GROUP BY c.name, c.sort_order
ORDER BY c.sort_order;
