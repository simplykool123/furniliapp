import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  FileText, 
  Image, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  X,
  FileImage,
  Loader2
} from "lucide-react";

interface UploadedFile {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  ocrText: string;
  extractedData: any;
  uploadedBy: number;
  uploadedAt: string;
  status: string;
}

interface QuoteUploadProps {
  onQuoteDataExtracted?: (data: any) => void;
  onClose?: () => void;
}

export default function QuoteUpload({ onQuoteDataExtracted, onClose }: QuoteUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [showOCRText, setShowOCRText] = useState(false);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error("Invalid response format"));
            }
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.open("POST", "/api/quotes/upload");
        
        // Add authorization header if needed
        const token = localStorage.getItem('token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.send(formData);
      });
    },
    onSuccess: (response: any) => {
      console.log("Quote upload successful:", response);
      setUploadedFile(response.file);
      
      if (response.file?.extractedData && onQuoteDataExtracted) {
        onQuoteDataExtracted(response.file.extractedData);
      }

      toast({
        title: "Success",
        description: "Quote file uploaded and processed successfully",
      });
    },
    onError: (error: any) => {
      console.error("Quote upload failed:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload quote file",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      console.log("Uploading quote file:", file.name);
      uploadMutation.mutate(file);
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    maxSize: 15 * 1024 * 1024, // 15MB
  });

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (fileType.startsWith('image/')) {
      return <FileImage className="h-8 w-8 text-blue-500" />;
    }
    return <Upload className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Upload Quote Document</h3>
          <p className="text-sm text-muted-foreground">
            Upload PDF, JPG, or PNG files. OCR will extract quote details automatically.
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Upload Area */}
      {!uploadedFile && (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-[hsl(28,100%,25%)] bg-[hsl(28,100%,97%)]' 
                  : 'border-gray-300 hover:border-[hsl(28,100%,25%)] hover:bg-gray-50'
                }
                ${uploadMutation.isPending ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} data-testid="input-quote-upload" />
              
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive ? 'Drop the file here' : 'Drag & drop your quote file'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse files
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    PDF
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Image className="h-3 w-3 mr-1" />
                    JPG
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Image className="h-3 w-3 mr-1" />
                    PNG
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  Maximum file size: 15MB
                </p>
              </div>
            </div>

            {/* Upload Progress */}
            {uploadMutation.isPending && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Result */}
      {uploadedFile && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Upload Successful
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {uploadedFile.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Info */}
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              {getFileIcon(uploadedFile.fileType)}
              <div className="ml-3 flex-1">
                <p className="font-medium">{uploadedFile.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(uploadedFile.fileSize)} • {uploadedFile.fileType}
                </p>
              </div>
            </div>

            {/* Extracted Data */}
            {uploadedFile.extractedData && Object.keys(uploadedFile.extractedData).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Extracted Data</h4>
                  <Badge variant="secondary" className="text-xs">
                    Auto-detected
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {uploadedFile.extractedData.quoteNumber && (
                    <div>
                      <span className="text-muted-foreground">Quote #:</span>
                      <p className="font-medium">{uploadedFile.extractedData.quoteNumber}</p>
                    </div>
                  )}
                  {uploadedFile.extractedData.date && (
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <p className="font-medium">{uploadedFile.extractedData.date}</p>
                    </div>
                  )}
                  {uploadedFile.extractedData.customerName && (
                    <div>
                      <span className="text-muted-foreground">Customer:</span>
                      <p className="font-medium">{uploadedFile.extractedData.customerName}</p>
                    </div>
                  )}
                  {uploadedFile.extractedData.totalAmount && (
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-medium">₹{uploadedFile.extractedData.totalAmount}</p>
                    </div>
                  )}
                  {uploadedFile.extractedData.phone && (
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <p className="font-medium">{uploadedFile.extractedData.phone}</p>
                    </div>
                  )}
                  {uploadedFile.extractedData.email && (
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{uploadedFile.extractedData.email}</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                {uploadedFile.extractedData.items && uploadedFile.extractedData.items.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-2">Items Detected ({uploadedFile.extractedData.items.length})</h5>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uploadedFile.extractedData.items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between text-xs p-2 bg-white rounded border">
                          <span className="flex-1">{item.description}</span>
                          <span className="text-muted-foreground">Qty: {item.quantity}</span>
                          {item.rate > 0 && <span className="text-right">₹{item.rate}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OCR Text */}
            {uploadedFile.ocrText && (
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowOCRText(!showOCRText)}
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {showOCRText ? 'Hide' : 'View'} OCR Text
                </Button>
                
                {showOCRText && (
                  <Textarea
                    value={uploadedFile.ocrText}
                    readOnly
                    className="text-xs font-mono resize-none"
                    rows={8}
                    placeholder="OCR text will appear here..."
                  />
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                onClick={() => {
                  setUploadedFile(null);
                  setUploadProgress(0);
                }}
                data-testid="button-upload-another"
              >
                Upload Another
              </Button>
              {onClose && (
                <Button variant="outline" size="sm" onClick={onClose}>
                  Done
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {uploadMutation.isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center text-red-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              <div>
                <p className="font-medium">Upload Failed</p>
                <p className="text-sm">{uploadMutation.error?.message || "Please try again"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}