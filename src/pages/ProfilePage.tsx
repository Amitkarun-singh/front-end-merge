import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  Mail,
  Phone,
  Calendar,
  School,
  GraduationCap,
  ChevronRight,
  Shield,
  FileText,
  Flame,
  Target,
  Languages,
  MapPin,
  Hash,
  BookOpen,
  Camera,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ProfilePage() {
  const { user, updateAvatar } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive display values from flat user object
  const displayName = user?.full_name || user?.name || user?.username || "Student";
  const email = user?.email || null;
  const phone = user?.phone_number || user?.number || null;
  const schoolName = user?.school_name || null;
  const board = user?.board || null;
  const className = user?.class || null;
  const section = user?.section || user?.div || null;
  const rollNumber = user?.roll_number || null;
  const address = user?.address || null;
  const gender = user?.gender || null;
  const dob = user?.dob || null;
  const language = user?.language || null;
  const joiningDate = user?.joining_date || null;
  const avatar = user?.avatar || null;

  const roleName =
    typeof user?.role === "string"
      ? user.role
      : (user?.role as { role_name?: string })?.role_name || "STUDENT";

  // Avatar initials (up to 2 chars)
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Profile completion
  const fields = [displayName, email, phone, schoolName, board, className, section, rollNumber, gender, dob, language, address];
  const filledCount = fields.filter((f) => f !== null && f !== undefined && f !== "").length;
  const profileCompletion = Math.round((filledCount / fields.length) * 100);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      await updateAvatar(file);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Profile</h1>
        </div>

        {/* Profile Completion Banner */}
        <div className="edtech-card mb-6 gradient-hero">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center font-bold text-primary text-lg">
                {profileCompletion}%
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {profileCompletion >= 100 ? "Profile complete!" : "Complete your profile"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {profileCompletion >= 100
                    ? "All details are filled in."
                    : "Fill in your details to get the best experience"}
                </p>
              </div>
            </div>
            <Progress value={profileCompletion} className="w-32 h-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Info */}
          <div className="space-y-6">
            {/* Avatar & Name */}
            <div className="edtech-card text-center">
              {/* Avatar with upload overlay */}
              <div className="relative w-24 h-24 mx-auto mb-4 group cursor-pointer" onClick={handleAvatarClick}>
                {avatar ? (
                  <img
                    src={avatar}
                    alt={displayName}
                    className="w-24 h-24 rounded-full object-cover border-2 border-primary/30"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                    {initials}
                  </div>
                )}

                {/* Upload overlay */}
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {uploadError && (
                <p className="text-xs text-destructive mb-2">{uploadError}</p>
              )}

              <p className="text-xs text-muted-foreground mb-2">
                Click avatar to upload photo
              </p>

              <h2 className="font-display text-xl font-semibold text-foreground">
                {displayName}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{roleName}</p>
              {joiningDate && (
                <p className="text-sm text-muted-foreground">
                  Joined {formatDate(joiningDate)}
                </p>
              )}

              <div className="mt-4 p-3 rounded-lg bg-accent/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {profileCompletion >= 100 ? "Profile complete" : "Complete your profile"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <Progress value={profileCompletion} className="h-1.5 mt-2" />
              </div>
            </div>

            {/* Statistics */}
            <div className="edtech-card">
              <h3 className="font-semibold text-foreground mb-4">Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold text-foreground">0%</p>
                  <p className="text-xs text-muted-foreground">Test Overall%</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                  <p className="text-lg font-bold text-foreground">1 Day</p>
                  <p className="text-xs text-muted-foreground">Login Days</p>
                </div>
              </div>
            </div>

            {/* Week's Activity */}
            <div className="edtech-card">
              <h3 className="font-semibold text-foreground mb-4">Week's Activity</h3>
              <div className="flex justify-center gap-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs ${
                      i === new Date().getDay()
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-3">
                Overall: 1 day active
              </p>
            </div>
          </div>

          {/* Right Column - Account Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="edtech-card">
              <h3 className="font-semibold text-foreground mb-6">Account Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Personal Details
                  </h4>

                  <InfoField icon={<User className="w-4 h-4" />} label="Full Name" value={displayName} />
                  <InfoField icon={<Phone className="w-4 h-4" />} label="Mobile" value={phone ? `+91 ${phone}` : null} />
                  <InfoField icon={<Mail className="w-4 h-4" />} label="Email" value={email} />
                  <InfoField icon={<Calendar className="w-4 h-4" />} label="Date of Birth" value={formatDate(dob)} placeholder="Not provided" />
                  <InfoField icon={<User className="w-4 h-4" />} label="Gender" value={gender} placeholder="Not provided" />
                  <InfoField icon={<Languages className="w-4 h-4" />} label="Preferred Language" value={language} placeholder="Not set" />
                </div>

                {/* School Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    School Details
                  </h4>

                  <InfoField icon={<School className="w-4 h-4" />} label="School Name" value={schoolName} />
                  <InfoField icon={<BookOpen className="w-4 h-4" />} label="Board" value={board} />
                  <InfoField icon={<GraduationCap className="w-4 h-4" />} label="Class" value={className} />
                  <InfoField icon={<Hash className="w-4 h-4" />} label="Section" value={section} />
                  <InfoField icon={<Hash className="w-4 h-4" />} label="Roll Number" value={rollNumber} />
                  <InfoField icon={<MapPin className="w-4 h-4" />} label="Address" value={address} />
                </div>
              </div>
            </div>

            {/* Footer Links */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Privacy Policy
              </a>
              <span>•</span>
              <a href="#" className="hover:text-primary flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Terms &amp; Conditions
              </a>
              <span>•</span>
              <span>Version 9.8.8</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Reusable info field component ---- */
function InfoField({
  icon,
  label,
  value,
  placeholder = "Not provided",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  placeholder?: string;
}) {
  const hasValue = value !== null && value !== undefined && value !== "";

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
        <p
          className={`text-sm font-medium truncate ${
            hasValue ? "text-foreground" : "text-muted-foreground/50 italic"
          }`}
        >
          {hasValue ? value : placeholder}
        </p>
      </div>
    </div>
  );
}