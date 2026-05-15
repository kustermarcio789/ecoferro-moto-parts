UPDATE public.products 
SET is_featured = true 
WHERE id IN (
  SELECT id FROM public.products 
  WHERE source = 'mercadolivre' 
  LIMIT 6
);