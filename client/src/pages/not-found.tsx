import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function NotFound() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setTimeout(() => {
      setLocation("/");
    }, 2000);
  }, []);
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">오! 길을 잘못 드셨네요.</p>
          <span className="mt-4 text-sm text-gray-600">
            걱정 말아요. 다시 리디렉트 해줄게요.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
