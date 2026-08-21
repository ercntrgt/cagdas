-- ============================================================================
-- service_role izinleri
--
-- Bu projede yeni tablolar Data API rollerine otomatik açılmıyor (config.toml →
-- api.schemas / auto-expose kapalı). Sunucu tarafındaki yönetim işleri
-- (kullanıcı oluşturma, geçmiş veri aktarımı) service_role ile yapıldığından
-- bu rolün tablolara erişimi açıkça verilmelidir.
--
-- service_role zaten RLS'i atlar; bu izinler yalnızca sunucu tarafında,
-- NEXT_PUBLIC_ olmayan anahtarla kullanılır.
-- ============================================================================

grant select, insert, update, delete on
  public.stocks,
  public.cash_transactions,
  public.trades,
  public.price_entries,
  public.profiles
to service_role;

grant select on
  public.positions,
  public.wallet_balance,
  public.realized_pnl_daily,
  public.realized_pnl_weekly,
  public.trade_activity_monthly,
  public.symbol_pnl_summary,
  public.symbol_analysis
to service_role;
