import { useState, useEffect } from "react";
import {
  FileQuestion,
  Clock,
  BookOpen,
  Search,
  Filter,
  ChevronRight,
  Star,
  Calendar,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { config } from "../../app.config.js";

/**
 * QuestionBankPage Component
 *
 * Provides a user interface for browsing and downloading previous year questions (PYQ)
 * and AI-predicted questions based on selected class, subject, and year.
 *
 * @returns {JSX.Element} The rendered Question Bank Page.
 */
export default function QuestionBankPage() {
  const [activeTab, setActiveTab] = useState("pyq");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedYear, setSelectedYear] = useState("");
  const [previousYearQuestions, setPreviousYearQuestions] = useState([]);
  const [predictQuestions, setPredictYearQuestions] = useState([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  const local = JSON.parse(localStorage.getItem("schools2ai_auth"));
  const token = local?.token;

  /**
   * Fetches a preview URL for a paper and opens it in a new tab.
   */
  const handlePreview = async (type: "pyq" | "predict", filePath: string) => {
    try {
      const response = await fetch(
        `${config.server}/${type}/papers/preview?filePath=${encodeURIComponent(filePath)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (data.previewUrl) {
        window.open(data.previewUrl, "_blank");
      }
    } catch (error) {
      console.error("Error fetching preview URL:", error);
    }
  };

  /**
   * Fetches a download URL for a paper and opens it in a new tab.
   */
  const handleDownload = async (type: "pyq" | "predict", filePath: string) => {
    try {
      const response = await fetch(
        `${config.server}/${type}/papers/download/?filePath=${encodeURIComponent(filePath)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      }
    } catch (error) {
      console.error("Error fetching download URL:", error);
    }
  };

  /**
   * Effect: Fetch available years when the tab changes or component mounts.
   */
  useEffect(() => {
    const fetchYears = async () => {
      if (activeTab === "aiq") {
        setAvailableYears([]);
        setSelectedYear("");
        return;
      }

      try {
        const response = await fetch(
          `${config.server}/pyq/papers/years?board=CBSE`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await response.json();
        if (data.years && data.years.length > 0) {
          setAvailableYears(data.years);
          setSelectedYear(data.years[0]); // Default to first available year
        }
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    };

    fetchYears();
  }, [activeTab, token]);

  /**
   * Effect: Fetch available classes based on active tab and selected year.
   */
  useEffect(() => {
    const fetchClasses = async () => {
      const type = activeTab === "pyq" ? "pyq" : "predict";
      let url = `${config.server}/${type}/papers/classes?board=CBSE`;
      
      if (activeTab === "pyq") {
        if (!selectedYear) return;
        url += `&year=${selectedYear}`;
      }

      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.subjects) {
          setClasses(data.subjects);
          setSelectedClass("all");
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };

    fetchClasses();
  }, [activeTab, selectedYear, token]);

  /**
   * Effect: Fetch subjects based on the selected class.
   */
  useEffect(() => {
    const fetchSubjects = async () => {
      if (selectedClass === "all") {
        setSubjects([]);
        setSelectedSubject("all");
        return;
      }

      const type = activeTab === "pyq" ? "pyq" : "predict";
      const classNameValue = selectedClass.replace("class-", "");
      
      let url = `${config.server}/${type}/papers/subject?board=CBSE&className=${classNameValue}`;
      
      if (activeTab === "pyq") {
        if (!selectedYear) return;
        url += `&year=${selectedYear}`;
      }

      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.subjects) {
          setSubjects(data.subjects);
          setSelectedSubject("all");
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    fetchSubjects();
  }, [activeTab, selectedClass, selectedYear, token]);

  /**
   * Fetches Previous Year Questions (PYQ) based on current filter selections.
   */
  const PYQ = async () => {
    try {
      const classNameValue = selectedClass === "all" ? "" : selectedClass.replace("class-", "");
      const subjectValue = selectedSubject === "all" ? "" : selectedSubject;

      const queryParams = new URLSearchParams({
        board: "CBSE",
        year: selectedYear,
        className: classNameValue,
        subject: subjectValue,
      });

      const url = `${config.server}/pyq/papers?${queryParams.toString()}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch papers");
      const data = await response.json();
      setPreviousYearQuestions(data);
    } catch (error) {
      console.error("Error fetching papers:", error);
    }
  };

  /**
   * Fetches AI-predicted questions based on current class and subject selections.
   */
  const getPredictQuestions = async () => {
    try {
      const classNameValue = selectedClass === "all" ? "" : selectedClass.replace("class-", "");
      const subjectValue = selectedSubject === "all" ? "" : selectedSubject;

      const queryParams = new URLSearchParams({
        board: "CBSE",
        className: classNameValue,
        subject: subjectValue,
      });

      const url = `${config.server}/predict/papers?${queryParams.toString()}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch papers");
      const data = await response.json();
      setPredictYearQuestions(data);
    } catch (error) {
      console.error("Error fetching papers:", error);
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Question Bank
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse previous year and AI-predicted questions
          </p>
        </div>

        {/* Filters */}
        <div className="edtech-card mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select 
              value={selectedYear} 
              onValueChange={setSelectedYear}
              disabled={activeTab === "aiq"}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={activeTab === "aiq" ? "Year N/A" : "Select Year"} />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls.replace("-", " ").toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {sub.charAt(0).toUpperCase() + sub.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              className="ml-auto"
              onClick={() => {
                if (activeTab === "pyq") PYQ();
                else getPredictQuestions();
              }}
              size="lg"
            >
              Search
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs 
          defaultValue="pyq" 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pyq" className="gap-2">
              <Calendar className="w-4 h-4" />
              Previous Year Questions
            </TabsTrigger>
            <TabsTrigger value="aiq" className="gap-2">
              <Brain className="w-4 h-4" />
              Predicted This Year Questions
            </TabsTrigger>
          </TabsList>

          {/* Previous Year Questions */}
          <TabsContent value="pyq" className="space-y-4">
            {previousYearQuestions.map((q: any, id) => (
              <div
                key={id}
                className="edtech-card hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {q.year}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {q.subject}
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        Class {q.className}
                      </Badge>
                      <Badge variant="destructive" className="text-xs">
                        {q.filePath?.split("/").pop()}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview("pyq", q.filePath)}
                    >
                      Preview
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleDownload("pyq", q.filePath)}
                    >
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Predicted Questions */}
          <TabsContent value="aiq" className="space-y-4">
            <div className="edtech-card bg-primary/5 border-primary/20 mb-4">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-primary" />
                <p className="text-sm text-foreground">
                  These questions are AI-predicted based on trends from previous
                  years. The confidence score indicates the likelihood of
                  similar questions appearing.
                </p>
              </div>
            </div>
            {predictQuestions.map((q: any, id) => (
              <div
                key={id}
                className="edtech-card hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {q.subject}
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        Class {q?.className || q?.class || "12th"}
                      </Badge>
                      {q.filePath && (
                        <Badge variant="destructive" className="text-xs">
                          {q.filePath.split("/").pop()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview("predict", q.filePath)}
                    >
                      Preview
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleDownload("predict", q.filePath)}
                    >
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
