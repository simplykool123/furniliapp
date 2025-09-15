import { useState, useEffect } from "react";
import RequestTable from "@/components/Requests/RequestTable";
import RequestFormSimplified from "@/components/Requests/RequestFormSimplified";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/auth";
import { Plus, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";

export default function MaterialRequests() {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [, setLocation] = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const user = authService.getUser();
  const isMobile = useIsMobile();

  // Parse projectId from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
    if (projectId) {
      setSelectedProjectId(parseInt(projectId));
      setShowNewRequest(true); // Auto-open form when projectId is provided
    }
  }, []);
  
  const canCreateRequests = user && ['user', 'manager', 'admin', 'staff'].includes(user.role);
  const canUploadBOQ = user && ['manager', 'admin', 'staff'].includes(user.role);

  return (
    <ResponsiveLayout
      title="Material Requests"
      subtitle="Manage and track material request workflows"
    >
      {/* Action Buttons - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
        {canCreateRequests && (
          <FurniliButton
            onClick={() => setShowNewRequest(true)}
            variant="furnili-primary"
            className="text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
            New Request
          </FurniliButton>
        )}
        {canUploadBOQ && (
          <FurniliButton
            onClick={() => setLocation('/boq')}
            variant="outline"
            className="text-sm sm:text-base w-full sm:w-auto"
          >
            <FileText className="w-4 h-4 mr-1.5 sm:mr-2" />
            BOQ Upload
          </FurniliButton>
        )}
      </div>

      <RequestTable />
      
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent 
          className={`${isMobile ? 'max-w-[95vw] max-h-[95vh] m-1 p-0' : 'max-w-4xl max-h-[90vh]'} overflow-hidden`} 
          aria-describedby="new-request-description"
        >
          <DialogHeader className={`${isMobile ? 'p-3 pb-2 border-b' : 'space-y-3'}`}>
            <DialogTitle className={`${isMobile ? 'text-base' : 'text-xl'} font-semibold text-foreground`}>
              Create New Material Request
            </DialogTitle>
            <p id="new-request-description" className="sr-only">
              Form to create a new material request with client details and product items
            </p>
          </DialogHeader>
          <div className={isMobile ? "h-full overflow-hidden" : ""}>
            <RequestFormSimplified 
              preSelectedProjectId={selectedProjectId}
              onClose={() => {
                setShowNewRequest(false);
                setSelectedProjectId(undefined);
              }}
              isMobile={isMobile}
            />
          </div>
        </DialogContent>
      </Dialog>
    </ResponsiveLayout>
  );
}
