import { useState } from "react";
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

const predictedQuestions = [
  {
    id: 1,
    subject: "Mathematics",
    chapter: "Coordinate Geometry",
    question:
      "Find the area of the triangle formed by the points (2, 3), (−1, 0), and (2, −4).",
    marks: 3,
    type: "Long Answer",
    difficulty: "Medium",
    confidence: 85,
  },
  {
    id: 2,
    subject: "Mathematics",
    chapter: "Real Numbers",
    question:
      "Find the LCM and HCF of 306 and 657 and verify that LCM × HCF = product of the two numbers.",
    marks: 3,
    type: "Long Answer",
    difficulty: "Medium",
    confidence: 92,
  },
  {
    id: 3,
    subject: "Mathematics",
    chapter: "Statistics",
    question:
      "The following distribution gives the daily income of 50 workers. Find the mean daily income.",
    marks: 5,
    type: "Long Answer",
    difficulty: "Hard",
    confidence: 78,
  },
  {
    id: 4,
    subject: "Mathematics",
    chapter: "Polynomials",
    question:
      "If one zero of the polynomial 3x² − 8x + 2k + 1 is seven times the other, find the value of k.",
    marks: 2,
    type: "Short Answer",
    difficulty: "Medium",
    confidence: 88,
  },
  {
    id: 5,
    subject: "Mathematics",
    chapter: "Quadratic Equations",
    question:
      "A train travels 360 km at a uniform speed. If the speed had been 5 km/h more, it would have taken 1 hour less. Find the speed.",
    marks: 5,
    type: "Long Answer",
    difficulty: "Hard",
    confidence: 74,
  },
];

export default function QuestionBankPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [previousYearQuestions, setPreviousYearQuestions] = useState([]);

  const years = [2025, 2024, 2023];

  const PYQ = async () => {
    try {
      const queryParams = new URLSearchParams({
        board: "CBSE", // static or from state if you have it
        year: selectedYear,
        className: selectedClass,
        subject: selectedSubject,
      });

      const url = `${config.server}/pyq/papers?${queryParams.toString()}`;

      console.log("Request URL:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch papers");
      }

      const data = await response.json();

      console.log("Response:", data);

      // optional: store in state
      // setPapers(data);

      setPreviousYearQuestions(data);
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
            {/* <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div> */}

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
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
                <SelectItem value="math">Mathematics</SelectItem>
                <SelectItem value="science">Science</SelectItem>
                <SelectItem value="english">English</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="9">9th Grade</SelectItem>
                <SelectItem value="10th">10th Grade</SelectItem>
                <SelectItem value="11">11th Grade</SelectItem>
                <SelectItem value="12">12th Grade</SelectItem>
              </SelectContent>
            </Select>
            <Button className="ml-auto" onClick={PYQ} size="lg">
              Search
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pyq" className="space-y-6">
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
            {previousYearQuestions
              // .filter((q) =>
              //   q.question.toLowerCase().includes(searchQuery.toLowerCase()),
              // )
              .map((q, id) => (
                <div
                  key={id}
                  className="edtech-card hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    {/* Left Section */}
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

                    {/* Right Section - Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `${config.server}/pyq/${q.filePath}`,
                            "_blank",
                          )
                        }
                      >
                        Preview
                      </Button>
                      <Button size="sm">Download</Button>
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
            {previousYearQuestions
              // .filter((q) =>
              //   q.question.toLowerCase().includes(searchQuery.toLowerCase()),
              // )
              .map((q) => (
                <div
                  key={q.id}
                  className="edtech-card hover:shadow-md transition-shadow p-4"
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    {/* Left Section */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {q.year}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {q.subject}
                        </Badge>
                        <Badge variant="default" className="text-xs">
                          Class {q?.class || "12th"}
                        </Badge>
                      </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Preview
                      </Button>
                      <Button size="sm">Download</Button>
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
