import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "./Layout";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export function UploadView() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [problemType, setProblemType] = useState<
    "multiple-choice" | "short-answer"
  >("multiple-choice");
  const [problemText, setProblemText] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", "", ""]);
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium"
  );
  const [tags, setTags] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCorrectOptionChange = (index: number) => {
    setCorrectOption(index);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerImageUpload = () => {
    document.getElementById("image-upload")?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to upload problems",
        variant: "destructive",
      });
      return;
    }

    if (!problemText.trim()) {
      toast({
        title: "Problem text required",
        description: "Please enter a problem",
        variant: "destructive",
      });
      return;
    }

    if (problemType === "multiple-choice") {
      // Validate all options are filled
      const emptyOptions = options.filter((opt) => !opt.trim());
      if (emptyOptions.length > 0) {
        toast({
          title: "All options required",
          description: "Please fill in all options",
          variant: "destructive",
        });
        return;
      }

      // Set correct answer to the selected option's value
      if (correctOption >= 0 && correctOption < options.length) {
        setCorrectAnswer(options[correctOption]);
      }
    } else if (problemType === "short-answer" && !correctAnswer) {
      toast({
        title: "Correct answer required",
        description: "Please provide the correct answer",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("type", problemType);
      formData.append("text", problemText);

      if (problemType === "multiple-choice") {
        formData.append("options", JSON.stringify(options));
        formData.append("correctAnswer", options[correctOption]);
      } else {
        formData.append("correctAnswer", correctAnswer);
      }

      formData.append("difficulty", difficulty);

      if (tags.trim()) {
        const tagArray = tags.split(",").map((tag) => tag.trim());
        formData.append("tags", JSON.stringify(tagArray));
      }

      if (image) {
        formData.append("image", image);
      }

      // Submit problem
      const response = await fetch("/api/problems", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload problem");
      }

      // Success
      toast({
        title: "Problem uploaded",
        description: "Your problem has been uploaded successfully",
      });

      // Update queries
      queryClient.invalidateQueries({ queryKey: ["/api/problems"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/problems"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      // Navigate back to feed
      navigate("/");
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload problem",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout
      title="문제 업로드"
      hideBottomNav={false}
      leftAction={
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Button>
      }
    >
      <div className="p-4">
        <form onSubmit={handleSubmit}>
          {/* Problem Type Selection */}
          <div className="mb-4">
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              문제 유형
            </Label>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={
                  problemType === "multiple-choice" ? "default" : "outline"
                }
                className="flex-1"
                onClick={() => setProblemType("multiple-choice")}
              >
                오지선다형
              </Button>
              <Button
                type="button"
                variant={problemType === "short-answer" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setProblemType("short-answer")}
              >
                주관식
              </Button>
            </div>
          </div>

          {/* Problem Text */}
          <div className="mb-4">
            <Label
              htmlFor="problem-text"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              문제 설명
            </Label>
            <Textarea
              id="problem-text"
              rows={3}
              placeholder="문제에 대한 설명을 올려주세요! 이미지로 대체해도 좋습니다"
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              className="resize-none"
            />
          </div>

          {/* Problem Image */}
          <div className="mb-4">
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              이미지 업로드 (선택)
            </Label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 cursor-pointer"
              onClick={triggerImageUpload}
            >
              {imagePreview ? (
                <div className="flex flex-col items-center">
                  <img
                    src={imagePreview}
                    alt="Selected problem image"
                    className="max-h-32 object-contain mb-2"
                  />
                  <p className="text-sm text-gray-500">
                    클릭해서 이미지 바꾸기
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    클릭해서 이미지 업로드하기
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG, GIF? ...
                  </p>
                </div>
              )}
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>
          </div>

          {/* Multiple Choice Options */}
          {problemType === "multiple-choice" && (
            <div className="mb-4">
              <Label className="block text-sm font-medium text-gray-700 mb-1">
                답안지 선택
              </Label>
              <div className="space-y-2">
                <RadioGroup
                  value={correctOption.toString()}
                  onValueChange={(value) =>
                    handleCorrectOptionChange(parseInt(value))
                  }
                >
                  {options.map((option, index) => (
                    <div className="flex items-center space-x-2" key={index}>
                      <RadioGroupItem
                        value={index.toString()}
                        id={`correct-option-${index}`}
                      />
                      <Input
                        type="text"
                        placeholder={`답 ${index + 1}`}
                        value={option}
                        onChange={(e) =>
                          handleOptionChange(index, e.target.value)
                        }
                        className="flex-1"
                      />
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Short Answer */}
          {problemType === "short-answer" && (
            <div className="mb-4">
              <Label
                htmlFor="correct-answer"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                주관식 답란
              </Label>
              <Input
                type="text"
                id="correct-answer"
                placeholder=""
                value={correctAnswer}
                onChange={(e) => {
                  // Only allow integers
                  const value = e.target.value;
                  if (value === "" || /^-?\d+$/.test(value)) {
                    setCorrectAnswer(value);
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                <u>정수</u>만 가능합니다
              </p>
            </div>
          )}

          {/* Difficulty Level */}
          <div className="mb-4">
            <Label
              htmlFor="difficulty"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              난이도
            </Label>
            <Select
              value={difficulty}
              onValueChange={(value: "easy" | "medium" | "hard") =>
                setDifficulty(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">쉬움</SelectItem>
                <SelectItem value="medium">보통</SelectItem>
                <SelectItem value="hard">어려움</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="mb-5">
            <Label
              htmlFor="problem-tags"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              태그 (선택)
            </Label>
            <Input
              type="text"
              id="problem-tags"
              placeholder="지수로그, 나머지정리, 미분계수의 정의 ,이차함수의 최대 최소, ..."
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">콤마로 구분하세요</p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !isAuthenticated}
          >
            {isSubmitting ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "업로드"
            )}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
