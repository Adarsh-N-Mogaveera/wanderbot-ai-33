import { useState, ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, Image as ImageIcon, Camera, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ImageMode = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 20MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedImage(base64String);
        analyzeImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const analyzeImage = async (imageData: string) => {
    setIsLoading(true);
    setResult("");

    try {
      const { data, error } = await supabase.functions.invoke('analyze-landmark', {
        body: { imageData },
      });

      if (error) throw error;

      setResult(data.analysis);
      
      // Extract confidence if present in response
      if (data.confidence) {
        setConfidence(data.confidence);
      }
      
      toast({
        title: "Analysis complete",
        description: "Image analyzed successfully",
      });
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

  return (
    <Card className="p-6 md:p-8">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold">Image Recognition</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Capture or upload a photo of a landmark
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isLoading}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isLoading}
            />
            
            <div className="flex gap-3 w-full md:w-auto">
              <Button
                size="lg"
                className="h-16 flex-1 md:flex-none md:px-8"
                disabled={isLoading}
                onClick={handleCameraCapture}
              >
                <Camera className="w-5 h-5 mr-2" />
                Capture
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="h-16 flex-1 md:flex-none md:px-8"
                disabled={isLoading}
                onClick={handleUploadClick}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>

            {selectedImage && (
              <div className="relative w-full max-w-md">
                <img
                  src={selectedImage}
                  alt="Selected landmark"
                  className="w-full rounded-lg border-2 border-border"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setSelectedImage(null);
                    setResult("");
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        {result && (
          <div className="p-4 bg-accent/5 rounded-lg border border-accent/20 animate-fade-in space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-4 h-4 text-accent" />
              <h3 className="font-semibold text-sm">Landmark Information:</h3>
            </div>
            <p className="text-sm leading-relaxed">{result}</p>
            {confidence && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-accent/20">
                <TrendingUp className="w-4 h-4" />
                <span>Confidence: {(confidence * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ImageMode;
