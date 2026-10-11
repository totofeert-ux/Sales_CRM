-- Templates feature schema
-- Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL CHECK (char_length(category) > 0),
  subtype text,
  title text NOT NULL,
  description text,
  content text NOT NULL DEFAULT '',
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create template_versions table to store last 3 versions
CREATE TABLE IF NOT EXISTS public.template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage only their own templates
CREATE POLICY "Select own templates" ON public.templates
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Insert own templates" ON public.templates
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own templates" ON public.templates
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Delete own templates" ON public.templates
FOR DELETE USING (auth.uid() = user_id);

-- Policies for versions: access via owning the parent template
CREATE POLICY "Select versions via parent" ON public.template_versions
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.templates t WHERE t.id = template_id AND t.user_id = auth.uid()
));

CREATE POLICY "Insert versions via parent" ON public.template_versions
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.templates t WHERE t.id = template_id AND t.user_id = auth.uid()
));

CREATE POLICY "Delete versions via parent" ON public.template_versions
FOR DELETE USING (EXISTS (
  SELECT 1 FROM public.templates t WHERE t.id = template_id AND t.user_id = auth.uid()
));

-- Timestamp update function (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on templates for updated_at
DROP TRIGGER IF EXISTS trg_templates_updated_at ON public.templates;
CREATE TRIGGER trg_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to keep only last 3 versions per template
CREATE OR REPLACE FUNCTION public.keep_last_three_versions()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.template_versions tv
  WHERE tv.template_id = NEW.template_id
    AND tv.id NOT IN (
      SELECT id FROM public.template_versions
      WHERE template_id = NEW.template_id
      ORDER BY created_at DESC
      LIMIT 3
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger after insert on template_versions
DROP TRIGGER IF EXISTS trg_keep_three_versions ON public.template_versions;
CREATE TRIGGER trg_keep_three_versions
AFTER INSERT ON public.template_versions
FOR EACH ROW EXECUTE FUNCTION public.keep_last_three_versions();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_templates_user ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category_subtype ON public.templates(category, subtype);
CREATE INDEX IF NOT EXISTS idx_templates_updated_at ON public.templates(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_versions_template_time ON public.template_versions(template_id, created_at DESC);
