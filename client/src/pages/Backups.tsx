import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileArchive, Clock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

// Get user from localStorage
const getUser = () => {
  const userStr = localStorage.getItem('authUser');
  return userStr ? JSON.parse(userStr) : null;
};

export default function Backups() {
  const [isDownloading, setIsDownloading] = useState(false);
  const user = getUser();
  const { toast } = useToast();

  const handleDownloadBackup = async () => {
    if (user?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can download backups.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    
    try {
      // Use the authenticated API request utility to handle token properly
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch('/api/backups/download-all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to download backup';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
          // Optionally redirect to login or refresh the page
          setTimeout(() => window.location.reload(), 2000);
        }
        
        throw new Error(errorMessage);
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `furnili_backup_${new Date().toISOString().split('T')[0]}.zip`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Backup Downloaded",
        description: "All data has been successfully exported as ZIP file.",
      });
    } catch (error) {
      console.error('Backup download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "There was an error downloading the backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ResponsiveLayout
      title="Data Backups"
      subtitle="Export and manage your business data"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          {user?.role === 'admin' && (
            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
              <Shield className="h-3 w-3 mr-1" />
              Admin Access
            </Badge>
          )}
        </div>

      <div className="grid gap-6">
        {/* Main Backup Card */}
        <Card className="bg-white dark:bg-gray-800 shadow-md border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-800 dark:text-white flex items-center gap-2">
              <FileArchive className="h-5 w-5" />
              Complete System Backup
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Download all your business data in a single ZIP file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="font-medium text-gray-800 dark:text-white mb-3">Included Data:</h3>
              <div className="grid md:grid-cols-2 gap-2">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  ✓ Product Inventory
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  ✓ Categories & Brands
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  ✓ Stock Movements
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  ✓ Material Requests
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  ✓ Staff Attendance
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  ✓ Payroll Data
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  ✓ Petty Cash Expenses
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  ✓ User Accounts
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Clock className="h-4 w-4 mr-1" />
                Last backup: Just now
              </div>
              <Button 
                onClick={handleDownloadBackup} 
                disabled={isDownloading || user?.role !== 'admin'}
                className="bg-[#D4B896] hover:bg-[#B8965C] text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? 'Generating...' : 'Download All Backups'}
              </Button>
            </div>

            {user?.role !== 'admin' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">
                    Only administrators can download complete system backups.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backup Information Card */}
        <Card className="bg-white dark:bg-gray-800 shadow-md border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-800 dark:text-white">Backup Information</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Important details about your data exports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <strong className="text-gray-800 dark:text-white">File Format:</strong> ZIP archive containing CSV files
              </div>
              <div>
                <strong className="text-gray-800 dark:text-white">Naming:</strong> furnili_backup_YYYY-MM-DD.zip
              </div>
              <div>
                <strong className="text-gray-800 dark:text-white">Contents:</strong> Each table exported as separate CSV file
              </div>
              <div>
                <strong className="text-gray-800 dark:text-white">Security:</strong> Data is compressed and ready for safe storage
              </div>
              <div>
                <strong className="text-gray-800 dark:text-white">Usage:</strong> Import into Excel, Google Sheets, or other database systems
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </ResponsiveLayout>
  );
}