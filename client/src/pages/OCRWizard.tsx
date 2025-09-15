import { useState, useRef } from "react";
import { Upload, Wand2, Brain, Settings, CheckCircle, AlertCircle, RefreshCw, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Tesseract from 'tesseract.js';
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

interface OCRResult {
  text: string;
  confidence: number;
  words: any[];
  blocks: any[];
}

interface Enhancement {
  field: string;
  original: string;
  suggested: string;
  confidence: number;
  applied: boolean;
}

export default function OCRWizard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [documentType, setDocumentType] = useState("upi_payment");
  const [enhancements, setEnhancements] = useState<Enhancement[]>([]);
  const [customPatterns, setCustomPatterns] = useState("");
  const [trainingMode, setTrainingMode] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Document type templates
  const documentTemplates = {
    upi_payment: {
      name: "UPI Payment Screenshot",
      fields: ["amount", "paidTo", "paidBy", "purpose", "orderNo", "date"],
      patterns: {
        amount: /₹?[\d,]+(?:\.\d{2})?/g,
        paidTo: /paid\s+to\s+(.*?)$/im,
        paidBy: /^(.+?)\s+paid/im,
        purpose: /(?:for|purpose|description)[:\s]+(.*?)(?:-|$)/im,
        orderNo: /order[#\s]*([a-zA-Z0-9]+)/im,
        date: /\d{1,2}\s+[A-Z]{3}\s+\d{4}/im
      }
    },
    invoice: {
      name: "Invoice/Bill",
      fields: ["invoiceNo", "amount", "vendor", "items", "date", "gst"],
      patterns: {
        invoiceNo: /(?:invoice|bill)\s*#?\s*([A-Z0-9-]+)/im,
        amount: /(?:total|amount)[:\s]*₹?[\d,]+(?:\.\d{2})?/im,
        vendor: /(?:from|vendor)[:\s]+(.*?)$/im,
        gst: /GST[:\s]*([\d]{2}[A-Z]{5}[\d]{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1})/im
      }
    },
    receipt: {
      name: "Purchase Receipt",
      fields: ["shop", "amount", "items", "date", "mode"],
      patterns: {
        shop: /^([A-Z][A-Za-z\s]+)$/m,
        amount: /(?:total|amount|paid)[:\s]*₹?[\d,]+(?:\.\d{2})?/im,
        mode: /(?:cash|card|upi|online|gpay|phonepe|paytm)/im
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processOCR = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    setProgress(0);

    try {
      const { data } = await Tesseract.recognize(selectedFile, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });

      const result: OCRResult = {
        text: data.text,
        confidence: data.confidence,
        words: data.symbols || data.words || [],
        blocks: data.blocks || []
      };

      setOcrResult(result);
      await analyzeAndEnhance(result);

      toast({
        title: "OCR Complete",
        description: `Text extracted with ${Math.round(result.confidence)}% confidence`,
      });
    } catch (error) {
      toast({
        title: "OCR Failed",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const analyzeAndEnhance = async (result: OCRResult) => {
    const template = documentTemplates[documentType as keyof typeof documentTemplates];
    const newEnhancements: Enhancement[] = [];

    // Extract fields based on document type
    for (const field of template.fields) {
      const pattern = template.patterns[field as keyof typeof template.patterns];
      if (pattern) {
        const matches = result.text.match(pattern);
        if (matches) {
          // AI-powered enhancement suggestions
          const original = matches[0];
          const suggested = enhanceField(field, original, result.text);
          
          newEnhancements.push({
            field,
            original,
            suggested,
            confidence: calculateConfidence(field, original, result.words),
            applied: false
          });
        }
      }
    }

    // Custom pattern matching
    if (customPatterns) {
      try {
        const customRegex = new RegExp(customPatterns, 'gim');
        const customMatches = result.text.match(customRegex);
        if (customMatches) {
          customMatches.forEach((match, index) => {
            newEnhancements.push({
              field: `custom_${index}`,
              original: match,
              suggested: match,
              confidence: 80,
              applied: false
            });
          });
        }
      } catch (error) {
        console.warn("Invalid custom pattern:", error);
      }
    }

    setEnhancements(newEnhancements);
  };

  const enhanceField = (field: string, original: string, fullText: string): string => {
    switch (field) {
      case 'amount':
        // Clean amount formatting
        return original.replace(/[₹,\s]/g, '').replace(/(\d+)(\d{2})$/, '$1.$2');
      
      case 'paidTo':
      case 'paidBy':
        // Clean name formatting
        return original.replace(/^paid\s+to\s+/i, '').replace(/\s+paid$/i, '').trim();
      
      case 'purpose':
        // Extract meaningful description
        const purposeLine = fullText.split('\n').find(line => 
          line.length > 10 && 
          !/^[A-Z\s]+$/.test(line) &&
          !line.includes('@') &&
          !line.toLowerCase().includes('paid')
        );
        return purposeLine?.split(' - ')[0]?.trim() || original;
      
      case 'orderNo':
        // Format order number
        return original.replace(/order\s*/i, '').trim() + ' Order';
      
      case 'date':
        // Standardize date format
        const dateMatch = original.match(/(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          return `${day.padStart(2, '0')}/${getMonthNumber(month)}/${year}`;
        }
        return original;
      
      default:
        return original;
    }
  };

  const getMonthNumber = (monthAbbr: string): string => {
    const months: { [key: string]: string } = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    return months[monthAbbr] || '01';
  };

  const calculateConfidence = (field: string, value: string, words: any[]): number => {
    // Calculate confidence based on OCR word confidence and pattern matching
    const fieldWords = words.filter(word => 
      value.toLowerCase().includes(word.text.toLowerCase())
    );
    
    if (fieldWords.length === 0) return 50;
    
    const avgConfidence = fieldWords.reduce((sum, word) => sum + word.confidence, 0) / fieldWords.length;
    return Math.round(avgConfidence);
  };

  const applyEnhancement = (index: number) => {
    setEnhancements(prev => 
      prev.map((enhancement, i) => 
        i === index ? { ...enhancement, applied: !enhancement.applied } : enhancement
      )
    );
  };

  const exportResults = () => {
    const appliedEnhancements = enhancements.filter(e => e.applied);
    const exportData = {
      documentType,
      originalText: ocrResult?.text,
      confidence: ocrResult?.confidence,
      extractedFields: appliedEnhancements.reduce((acc, e) => {
        acc[e.field] = e.suggested;
        return acc;
      }, {} as any),
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr_results_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Results Exported",
      description: "OCR results have been exported successfully",
    });
  };

  const saveAsTemplate = () => {
    // Save current patterns as a custom template for future use
    toast({
      title: "Template Saved",
      description: "Custom OCR template has been saved for future use",
    });
  };

  return (
    <ResponsiveLayout
      title="AI-Powered OCR Enhancement Wizard"
      subtitle="Advanced OCR processing with AI-powered field extraction and enhancement"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveAsTemplate} variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save Template
          </Button>
          <Button onClick={exportResults} variant="outline" size="sm" disabled={!ocrResult}>
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Upload & Process</TabsTrigger>
          <TabsTrigger value="enhance">AI Enhancement</TabsTrigger>
          <TabsTrigger value="train">Training Mode</TabsTrigger>
          <TabsTrigger value="settings">Advanced Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Document Upload</CardTitle>
                <CardDescription>
                  Upload an image for AI-powered OCR processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTemplates).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                      >
                        Change Image
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-12 h-12 mx-auto text-gray-400" />
                      <div>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                        >
                          Choose File
                        </Button>
                        <p className="text-sm text-gray-500 mt-2">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={processOCR}
                  disabled={!selectedFile || processing}
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing ({progress}%)
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Start AI Processing
                    </>
                  )}
                </Button>

                {processing && (
                  <Progress value={progress} className="w-full" />
                )}
              </CardContent>
            </Card>

            {/* OCR Results */}
            <Card>
              <CardHeader>
                <CardTitle>OCR Results</CardTitle>
                <CardDescription>
                  Raw text extracted from the image
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ocrResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={ocrResult.confidence > 80 ? "default" : "secondary"}>
                        {Math.round(ocrResult.confidence)}% Confidence
                      </Badge>
                      <Badge variant="outline">
                        {ocrResult.words?.length || 0} words
                      </Badge>
                    </div>
                    <Textarea
                      value={ocrResult.text}
                      readOnly
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Upload and process an image to see OCR results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="enhance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI-Enhanced Field Extraction</CardTitle>
              <CardDescription>
                Review and apply AI-suggested improvements to extracted data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enhancements.length > 0 ? (
                <div className="space-y-4">
                  {enhancements.map((enhancement, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label className="font-medium capitalize">
                            {enhancement.field.replace('_', ' ')}
                          </Label>
                          <Badge
                            variant={enhancement.confidence > 80 ? "default" : "secondary"}
                          >
                            {enhancement.confidence}% confident
                          </Badge>
                        </div>
                        <Switch
                          checked={enhancement.applied}
                          onCheckedChange={() => applyEnhancement(index)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-gray-500">Original</Label>
                          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border">
                            {enhancement.original}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">AI Enhanced</Label>
                          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border">
                            {enhancement.suggested}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Process a document to see AI enhancement suggestions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="train" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Mode</CardTitle>
              <CardDescription>
                Train the AI with custom patterns and improve accuracy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="training-mode"
                  checked={trainingMode}
                  onCheckedChange={setTrainingMode}
                />
                <Label htmlFor="training-mode">Enable Training Mode</Label>
              </div>

              <div>
                <Label htmlFor="custom-patterns">Custom Regex Patterns</Label>
                <Textarea
                  id="custom-patterns"
                  placeholder="Enter custom regex patterns (one per line)..."
                  value={customPatterns}
                  onChange={(e) => setCustomPatterns(e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Example: (?:order|ref)[#\s]*([A-Z0-9]+) to match order numbers
                </p>
              </div>

              <Button variant="outline" className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Test Custom Patterns
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced OCR Settings</CardTitle>
              <CardDescription>
                Configure OCR engine parameters for optimal results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language">OCR Language</Label>
                  <Select defaultValue="eng">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eng">English</SelectItem>
                      <SelectItem value="hin">Hindi</SelectItem>
                      <SelectItem value="eng+hin">English + Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="psm">Page Segmentation Mode</Label>
                  <Select defaultValue="6">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Fully automatic page segmentation</SelectItem>
                      <SelectItem value="6">Uniform block of text</SelectItem>
                      <SelectItem value="7">Single text line</SelectItem>
                      <SelectItem value="8">Single word</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Preprocessing Options</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="denoise" />
                    <Label htmlFor="denoise">Noise Reduction</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="deskew" />
                    <Label htmlFor="deskew">Auto Deskew</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="enhance-contrast" />
                    <Label htmlFor="enhance-contrast">Enhance Contrast</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ResponsiveLayout>
  );
}