CREATE TABLE public.rate_limit_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL,
  identifier text NOT NULL,
  ip text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_limit_events TO service_role;

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_rate_limit_events_lookup
  ON public.rate_limit_events (key, identifier, created_at DESC);

CREATE INDEX idx_rate_limit_events_created_at
  ON public.rate_limit_events (created_at);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key text,
  _identifier text,
  _ip text,
  _max integer,
  _window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - make_interval(secs => _window_seconds);
  _count integer;
  _oldest timestamptz;
  _retry integer := 0;
BEGIN
  SELECT count(*), min(created_at)
    INTO _count, _oldest
  FROM public.rate_limit_events
  WHERE key = _key
    AND identifier = _identifier
    AND created_at >= _since;

  IF _count >= _max THEN
    _retry := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (_oldest + make_interval(secs => _window_seconds) - now())))::int);
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after', _retry,
      'limit', _max
    );
  END IF;

  INSERT INTO public.rate_limit_events (key, identifier, ip)
  VALUES (_key, _identifier, _ip);

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', GREATEST(0, _max - _count - 1),
    'retry_after', 0,
    'limit', _max
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_rate_limit(
  _key text,
  _identifier text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_events
  WHERE key = _key AND identifier = _identifier;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_events
  WHERE created_at < now() - interval '7 days';
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, text, integer, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_rate_limit(text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_rate_limit_events() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_events() TO service_role;