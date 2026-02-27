import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  GraduationCap, 
  Award, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Send,
  Fingerprint,
  RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';

type Qualification = 'B.Tech' | 'B.E.' | 'B.Sc' | 'BCA' | 'M.Tech' | 'M.Sc' | 'MCA' | 'MBA';
type InterviewStatus = 'Cleared' | 'Waitlisted' | 'Rejected';
type ScoreMode = 'Percentage' | 'CGPA';

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  qualification: Qualification | '';
  graduationYear: string;
  score: string;
  scoreMode: ScoreMode;
  screeningScore: string;
  interviewStatus: InterviewStatus | '';
  aadhaarNumber: string;
  offerLetterSent: boolean;
}

interface ValidationErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  dob?: string;
  qualification?: string;
  graduationYear?: string;
  score?: string;
  screeningScore?: string;
  aadhaarNumber?: string;
  interviewStatus?: string;
  offerLetterSent?: string;
}

interface ValidationWarnings {
  dob?: string;
  graduationYear?: string;
  score?: string;
  screeningScore?: string;
}

interface AuditLogEntry {
  id: string;
  fullName: string;
  email: string;
  interviewStatus: string;
  exceptionCount: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  timestamp: string;
}

const INITIAL_STATE: FormState = {
  fullName: '',
  email: '',
  phone: '',
  dob: '',
  qualification: '',
  graduationYear: '',
  score: '',
  scoreMode: 'Percentage',
  screeningScore: '',
  interviewStatus: '',
  aadhaarNumber: '',
  offerLetterSent: false,
};

const INITIAL_RULES = {
  minAge: 18,
  maxFutureGradYears: 2,
  minPercentage: 60,
  minCGPA: 6.0,
  minScreeningScore: 40,
  highRiskThreshold: 2
};

export default function App() {
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [rules, setRules] = useState(INITIAL_RULES);
  const [tempRules, setTempRules] = useState(INITIAL_RULES);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [warnings, setWarnings] = useState<ValidationWarnings>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('admitguard_audit_log');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist audit log to localStorage
  useEffect(() => {
    localStorage.setItem('admitguard_audit_log', JSON.stringify(auditLog));
  }, [auditLog]);

  const validate = (data: FormState, currentRules: typeof INITIAL_RULES) => {
    const newErrors: ValidationErrors = {};
    const newWarnings: ValidationWarnings = {};

    // --- STRICT RULES ---
    // Full Name
    if (!data.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    } else if (data.fullName.trim().length < 2) {
      newErrors.fullName = 'Minimum 2 characters required';
    } else if (/\d/.test(data.fullName)) {
      newErrors.fullName = 'Numbers are not allowed in name';
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(data.email)) {
      newErrors.email = 'Invalid email format (e.g. user@domain.com)';
    }

    // Phone
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!data.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(data.phone)) {
      newErrors.phone = 'Must be 10 digits starting with 6, 7, 8, or 9';
    }

    // Qualification
    if (!data.qualification) {
      newErrors.qualification = 'Please select a qualification';
    }

    // Aadhaar
    const aadhaarRegex = /^\d{12}$/;
    if (!data.aadhaarNumber) {
      newErrors.aadhaarNumber = 'Aadhaar Number is required';
    } else if (!aadhaarRegex.test(data.aadhaarNumber)) {
      newErrors.aadhaarNumber = 'Must be exactly 12 digits (numbers only)';
    }

    // Offer Letter Sent logic
    if (data.offerLetterSent) {
      if (data.interviewStatus !== 'Cleared' && data.interviewStatus !== 'Waitlisted') {
        newErrors.offerLetterSent = 'Offer letter can only be sent to Cleared or Waitlisted candidates';
      }
    }

    // Interview Status
    if (data.interviewStatus === 'Rejected') {
      newErrors.interviewStatus = 'Rejected candidates cannot be enrolled';
    }

    // --- SOFT RULES (Exceptions) ---
    // Date of Birth (Min Age)
    if (data.dob) {
      const birthDate = new Date(data.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < currentRules.minAge) {
        newWarnings.dob = `Candidate is under ${currentRules.minAge} years old (Exception)`;
      }
    }

    // Graduation Year (Max Future Years)
    if (data.graduationYear) {
      const currentYear = new Date().getFullYear();
      const gradYear = parseInt(data.graduationYear);
      if (gradYear > currentYear + currentRules.maxFutureGradYears) {
        newWarnings.graduationYear = `Graduation year is beyond ${currentYear + currentRules.maxFutureGradYears} (Exception)`;
      }
    }

    // Percentage/CGPA
    if (data.score) {
      const scoreVal = parseFloat(data.score);
      if (data.scoreMode === 'Percentage') {
        if (scoreVal < currentRules.minPercentage) {
          newWarnings.score = `Percentage is below ${currentRules.minPercentage}% (Exception)`;
        }
      } else {
        if (scoreVal < currentRules.minCGPA) {
          newWarnings.score = `CGPA is below ${currentRules.minCGPA.toFixed(1)} (Exception)`;
        }
      }
    }

    // Screening Test Score
    if (data.screeningScore) {
      const screeningVal = parseFloat(data.screeningScore);
      if (screeningVal < currentRules.minScreeningScore) {
        newWarnings.screeningScore = `Screening score is below ${currentRules.minScreeningScore} (Exception)`;
      }
    }

    return { errors: newErrors, warnings: newWarnings };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    const { errors: newErrors, warnings: newWarnings } = validate(updatedData, rules);
    setErrors(newErrors);
    setWarnings(newWarnings);
  };

  const toggleScoreMode = () => {
    const updatedData = {
      ...formData,
      scoreMode: formData.scoreMode === 'Percentage' ? 'CGPA' : 'Percentage' as ScoreMode
    };
    setFormData(updatedData);
    const { errors: newErrors, warnings: newWarnings } = validate(updatedData, rules);
    setErrors(newErrors);
    setWarnings(newWarnings);
  };

  const toggleOfferLetter = () => {
    const updatedData = {
      ...formData,
      offerLetterSent: !formData.offerLetterSent
    };
    setFormData(updatedData);
    const { errors: newErrors, warnings: newWarnings } = validate(updatedData, rules);
    setErrors(newErrors);
    setWarnings(newWarnings);
  };

  const handleReset = () => {
    setFormData(INITIAL_STATE);
    setErrors({});
    setWarnings({});
  };

  const handleRuleChange = (key: keyof typeof INITIAL_RULES, value: string) => {
    const numValue = parseFloat(value) || 0;
    setTempRules(prev => ({ ...prev, [key]: numValue }));
  };

  const updateRules = () => {
    setRules(tempRules);
    const { errors: newErrors, warnings: newWarnings } = validate(formData, tempRules);
    setErrors(newErrors);
    setWarnings(newWarnings);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    const currentExceptionCount = Object.keys(warnings).length;
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';

    if (currentExceptionCount === 0) {
      riskLevel = 'Low';
    } else if (currentExceptionCount <= rules.highRiskThreshold) {
      riskLevel = 'Medium';
    } else {
      riskLevel = 'High';
    }

    const newEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      fullName: formData.fullName,
      email: formData.email,
      interviewStatus: formData.interviewStatus,
      exceptionCount: currentExceptionCount,
      riskLevel,
      timestamp: new Date().toLocaleString(),
    };

    setAuditLog(prev => [newEntry, ...prev]);
    handleReset();
    alert('Admission record submitted and logged successfully.');
  };

  const clearLog = () => {
    if (confirm('Are you sure you want to clear the entire audit log?')) {
      setAuditLog([]);
    }
  };

  const exceptionCount = Object.keys(warnings).length;
  const isHighRisk = exceptionCount >= rules.highRiskThreshold;

  const isFormValid = () => {
    const { errors: currentErrors } = validate(formData, rules);
    const hasStrictErrors = Object.values(currentErrors).some(error => !!error);
    const requiredFields: (keyof FormState)[] = ['fullName', 'email', 'phone', 'qualification', 'aadhaarNumber'];
    const allRequiredFilled = requiredFields.every(field => !!formData[field]);
    
    return !hasStrictErrors && allRequiredFilled && formData.interviewStatus !== 'Rejected';
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
          {/* Rejected Banner */}
          {formData.interviewStatus === 'Rejected' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-red-600 text-white px-8 py-3 text-sm font-bold flex items-center gap-2"
            >
              <XCircle size={18} />
              Rejected candidates cannot be enrolled.
            </motion.div>
          )}

          {/* High Risk Banner */}
          {isHighRisk && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-amber-400 text-amber-950 px-8 py-3 text-sm font-bold flex items-center gap-2 border-b border-amber-500/20"
            >
              <Clock size={18} />
              High Risk Application - Multiple Soft Rule Violations
            </motion.div>
          )}

          {/* Admin Rule Config Section */}
          <div className="bg-slate-50 px-8 py-6 border-b border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Admin Rule Configuration (Demo)</h2>
              {showSuccess && (
                <motion.span 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"
                >
                  <CheckCircle2 size={12} />
                  Rules updated successfully.
                </motion.span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-4">
              {(Object.keys(INITIAL_RULES) as Array<keyof typeof INITIAL_RULES>).map((key) => (
                <div key={key} className="space-y-1">
                  <p className="text-[9px] text-slate-400 font-semibold truncate uppercase">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <input
                    type="number"
                    step="0.1"
                    value={tempRules[key]}
                    onChange={(e) => handleRuleChange(key, e.target.value)}
                    className="w-full text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={updateRules}
              className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-800 transition-all shadow-sm"
            >
              Update Rules
            </button>
          </div>

          {/* Header */}
          <div className="bg-slate-900 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Admission Form</h1>
            <p className="text-slate-400 text-sm mt-1">Internal Candidate Screening & Enrollment</p>
          </div>

          <form className="p-8 space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none ${
                    errors.fullName ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <div className="h-5 text-xs text-red-500 mt-1 font-medium">{errors.fullName}</div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Mail size={16} className="text-slate-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@business.com"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none ${
                    errors.email ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <div className="h-5 text-xs text-red-500 mt-1 font-medium">{errors.email}</div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Phone size={16} className="text-slate-400" />
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none ${
                    errors.phone ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <div className="h-5 text-xs text-red-500 mt-1 font-medium">{errors.phone}</div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none ${
                    warnings.dob ? 'border-amber-500' : 'border-slate-200'
                  }`}
                />
                <div className="h-5 text-xs text-amber-600 mt-1 font-medium">{warnings.dob}</div>
              </div>

              {/* Qualification */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <GraduationCap size={16} className="text-slate-400" />
                  Highest Qualification
                </label>
                <select
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none appearance-none ${
                    errors.qualification ? 'border-red-500' : 'border-slate-200'
                  }`}
                >
                  <option value="">Select Qualification</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="B.E.">B.E.</option>
                  <option value="B.Sc">B.Sc</option>
                  <option value="BCA">BCA</option>
                  <option value="M.Tech">M.Tech</option>
                  <option value="M.Sc">M.Sc</option>
                  <option value="MCA">MCA</option>
                  <option value="MBA">MBA</option>
                </select>
                <div className="h-5 text-xs text-red-500 mt-1 font-medium">{errors.qualification}</div>
              </div>

              {/* Graduation Year */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  Graduation Year
                </label>
                <input
                  type="number"
                  name="graduationYear"
                  value={formData.graduationYear}
                  onChange={handleChange}
                  placeholder="2023"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none ${
                    warnings.graduationYear ? 'border-amber-500' : 'border-slate-200'
                  }`}
                />
                <div className="h-5 text-xs text-amber-600 mt-1 font-medium">{warnings.graduationYear}</div>
              </div>

              {/* Percentage/CGPA */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Award size={16} className="text-slate-400" />
                    {formData.scoreMode}
                  </label>
                  <button 
                    type="button"
                    onClick={toggleScoreMode}
                    className="text-[10px] uppercase tracking-wider font-bold text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Switch to {formData.scoreMode === 'Percentage' ? 'CGPA' : 'Percentage'}
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  name="score"
                  value={formData.score}
                  onChange={handleChange}
                  placeholder={formData.scoreMode === 'Percentage' ? 'e.g. 85.5' : 'e.g. 8.5'}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none ${
                    warnings.score ? 'border-amber-500' : 'border-slate-200'
                  }`}
                />
                <div className="h-5 text-xs text-amber-600 mt-1 font-medium">{warnings.score}</div>
              </div>

              {/* Screening Test Score */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  Screening Test Score (0-100)
                </label>
                <input
                  type="number"
                  name="screeningScore"
                  value={formData.screeningScore}
                  onChange={handleChange}
                  placeholder="80"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none ${
                    warnings.screeningScore ? 'border-amber-500' : 'border-slate-200'
                  }`}
                />
                <div className="h-5 text-xs text-amber-600 mt-1 font-medium">{warnings.screeningScore}</div>
              </div>

              {/* Aadhaar Number */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Fingerprint size={16} className="text-slate-400" />
                  Aadhaar Number
                </label>
                <input
                  type="text"
                  name="aadhaarNumber"
                  value={formData.aadhaarNumber}
                  onChange={handleChange}
                  placeholder="0000 0000 0000"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none ${
                    errors.aadhaarNumber ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <div className="h-5 text-xs text-red-500 mt-1 font-medium">{errors.aadhaarNumber}</div>
              </div>

              {/* Interview Status */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  {formData.interviewStatus === 'Cleared' && <CheckCircle2 size={16} className="text-emerald-500" />}
                  {formData.interviewStatus === 'Rejected' && <XCircle size={16} className="text-red-500" />}
                  {formData.interviewStatus === 'Waitlisted' && <Clock size={16} className="text-amber-500" />}
                  {!formData.interviewStatus && <Clock size={16} className="text-slate-400" />}
                  Interview Status
                </label>
                <select
                  name="interviewStatus"
                  value={formData.interviewStatus}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none appearance-none ${
                    formData.interviewStatus === 'Rejected' ? 'border-red-500 text-red-600' : 'border-slate-200'
                  }`}
                >
                  <option value="">Select Status</option>
                  <option value="Cleared">Cleared</option>
                  <option value="Waitlisted">Waitlisted</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <div className="h-5 text-xs text-red-500 mt-1 font-medium">{errors.interviewStatus}</div>
              </div>

            </div>

            {/* Offer Letter Toggle */}
            <div className={`flex flex-col p-4 bg-slate-50 rounded-xl border transition-colors ${
              errors.offerLetterSent ? 'border-red-500 bg-red-50' : 'border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${formData.offerLetterSent ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    <Send size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Offer Letter Sent</h3>
                    <p className="text-xs text-slate-500">Has the official offer been dispatched?</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleOfferLetter}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 ${
                    formData.offerLetterSent ? 'bg-slate-900' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.offerLetterSent ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {errors.offerLetterSent && (
                <div className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1">
                  <XCircle size={12} />
                  {errors.offerLetterSent}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    exceptionCount > 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    Exceptions: {exceptionCount}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isFormValid()}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                Submit Admission Record
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 bg-white text-slate-600 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                Reset Form
              </button>

              <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
                Internal Use Only • Secure Data Entry
              </p>
            </div>
          </form>
        </div>

        {/* Audit Log Section */}
        <div className="mt-12 bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
          <div className="bg-slate-100 px-8 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <FileText size={18} className="text-slate-400" />
              Audit Log (Recent Submissions)
            </h2>
            {auditLog.length > 0 && (
              <button 
                onClick={clearLog}
                className="text-[10px] font-bold text-red-600 hover:text-red-700 uppercase tracking-wider"
              >
                Clear Log
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            {auditLog.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-400 text-sm italic">No submission records found.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-8 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Candidate</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Risk Level</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exceptions</th>
                    <th className="px-8 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="font-semibold text-slate-900 text-sm">{entry.fullName}</div>
                        <div className="text-xs text-slate-500">{entry.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          entry.riskLevel === 'Low' ? 'bg-emerald-100 text-emerald-700' :
                          entry.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {entry.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-600">
                        {entry.exceptionCount}
                      </td>
                      <td className="px-8 py-4 text-right text-xs text-slate-400 font-mono">
                        {entry.timestamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
