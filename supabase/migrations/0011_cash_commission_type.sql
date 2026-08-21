-- ============================================================================
-- Cüzdana üçüncü hareket tipi: komisyon / masraf
--
-- İşlem başına komisyon girmek yerine (ya da ona ek olarak) dönemsel komisyon
-- ve masrafları doğrudan cüzdana kaydedebilmek için.
--
-- Not: enum'a yeni değer eklemek ile o değeri kullanmak aynı transaction'da
-- olamaz; bu yüzden kullanım bir sonraki migration'da (0012).
-- ============================================================================

alter type public.cash_type add value if not exists 'commission';
