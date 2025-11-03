-- Add new columns to profiles table for enhanced personalization
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS accessibility_needs TEXT[];

-- Create trip history table
CREATE TABLE IF NOT EXISTS public.trip_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  itinerary JSONB NOT NULL,
  trip_date TIMESTAMP WITH TIME ZONE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on trip_history
ALTER TABLE public.trip_history ENABLE ROW LEVEL SECURITY;

-- Create policies for trip_history
CREATE POLICY "Users can view their own trip history"
ON public.trip_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trip history"
ON public.trip_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip history"
ON public.trip_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip history"
ON public.trip_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create destination ratings table
CREATE TABLE IF NOT EXISTS public.destination_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_name TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  visited_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on destination_ratings
ALTER TABLE public.destination_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for destination_ratings
CREATE POLICY "Users can view their own ratings"
ON public.destination_ratings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ratings"
ON public.destination_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
ON public.destination_ratings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON public.destination_ratings
FOR DELETE
USING (auth.uid() = user_id);

-- Create favorite destinations table
CREATE TABLE IF NOT EXISTS public.favorite_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_name TEXT NOT NULL,
  category TEXT,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, destination_name)
);

-- Enable RLS on favorite_destinations
ALTER TABLE public.favorite_destinations ENABLE ROW LEVEL SECURITY;

-- Create policies for favorite_destinations
CREATE POLICY "Users can view their own favorites"
ON public.favorite_destinations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites"
ON public.favorite_destinations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.favorite_destinations
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for trip_history updated_at
CREATE TRIGGER update_trip_history_updated_at
BEFORE UPDATE ON public.trip_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();