import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ImageMode = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setSelectedImage(imageData);
      await analyzeLandmark(imageData);
    };
    reader.readAsDataURL(file);
  };

  const analyzeLandmark = async (imageData: string) => {
    setIsLoading(true);
    setResponse("");
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-landmark', {
        body: { imageData },
      });

      if (error) throw error;

      setResponse(data.information);
      speakResponse(data.information);
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Error",
        description: "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const speakResponse = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Card className="p-8">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Image Recognition Mode</h2>
          <p className="text-muted-foreground">
            Upload a photo of a landmark to learn about it
          </p>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <label
            htmlFor="image-upload"
            className="cursor-pointer w-full max-w-md"
          >
            <div className="border-2 border-dashed border-border rounded-lg p-12 hover:border-primary transition-colors text-center">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Uploaded landmark"
                  className="max-h-64 mx-auto rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <Upload className="w-16 h-16 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                </div>
              )}
            </div>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>

          {selectedImage && (
            <Button
              onClick={() => {
                setSelectedImage(null);
                setResponse("");
              }}
              variant="outline"
            >
              Clear Image
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="animate-pulse text-center">Analyzing image...</p>
          </div>
        )}

        {response && (
          <div className="mt-6 p-6 bg-accent/5 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-lg">Landmark Information:</h3>
            </div>
            <p className="text-left leading-relaxed">{response}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ImageMode;