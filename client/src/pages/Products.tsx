import { useState, useEffect } from "react";
import ProductTable from "@/components/Products/ProductTable";
import ProductForm from "@/components/Products/ProductForm";
import BulkImportModal from "@/components/Products/BulkImportModal";
import BulkExportModal from "@/components/Products/BulkExportModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { authService } from "@/lib/auth";
import MobileProductTable from "@/components/Mobile/MobileProductTable";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import type { Product } from "@shared/schema";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";

export default function Products() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const user = authService.getUser();
  const isMobile = useIsMobile();
  
  const canManageProducts = user && ['admin', 'manager'].includes(user.role);

  // Listen for the add product event from Layout
  useEffect(() => {
    const handleOpenAddProduct = () => {
      if (canManageProducts) {
        setShowAddProduct(true);
      }
    };

    const handleOpenEditProduct = (event: any) => {
      if (canManageProducts) {
        setEditingProduct(event.detail);
        setShowAddProduct(true);
      }
    };

    window.addEventListener('openAddProductModal', handleOpenAddProduct);
    window.addEventListener('openEditProductModal', handleOpenEditProduct);
    return () => {
      window.removeEventListener('openAddProductModal', handleOpenAddProduct);
      window.removeEventListener('openEditProductModal', handleOpenEditProduct);
    };
  }, [canManageProducts]);

  return (
    <ResponsiveLayout
      title="Products"
      subtitle="Manage your raw materials, finishing goods, assemblies and seasonal items"
      showAddButton={canManageProducts || false}
      onAddClick={() => setShowAddProduct(true)}
    >
      {/* Bulk Operations - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
        <BulkExportModal />
        {canManageProducts && (
          <BulkImportModal onSuccess={() => {
            // Refresh the table
            window.location.reload();
          }} />
        )}
        {canManageProducts && (
          <FurniliButton 
            onClick={() => setShowAddProduct(true)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </FurniliButton>
        )}
      </div>

      {isMobile ? (
        <MobileProductTable 
          onEdit={(product) => {
            // Transform product for form compatibility
            const formProduct = {
              ...product,
              pricePerUnit: product.pricePerUnit
            };
            setEditingProduct(formProduct as any);
            setShowAddProduct(true);
          }}
          onDelete={(product) => {
            // Handle delete - could add confirmation dialog
            console.log("Delete product:", product);
          }}
          onView={(product) => {
            // Handle view details
            console.log("View product:", product);
          }}
        />
      ) : (
        <ProductTable />
      )}
      
      <Dialog open={showAddProduct} onOpenChange={(open) => {
        setShowAddProduct(open);
        if (!open) setEditingProduct(null);
      }}>
        <DialogContent className={`${isMobile ? 'max-w-[95vw] h-[95vh] p-0' : 'max-w-[90vw] sm:max-w-2xl lg:max-w-4xl'} max-h-[90vh] overflow-hidden`} aria-describedby="product-form-description">
          <div className={`${isMobile ? 'h-full flex flex-col' : 'max-h-[80vh] flex flex-col'}`}>
            <DialogHeader className={`space-y-3 ${isMobile ? 'p-4 pb-2 border-b' : 'px-6 pt-6 pb-2 border-b'} flex-shrink-0`}>
              <DialogTitle className="text-xl font-semibold text-foreground">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Update product details and specifications' : 'Add a new product to your inventory with details and specifications'}
              </DialogDescription>
          </DialogHeader>
          <div className={`${isMobile ? 'flex-1 overflow-y-auto' : 'flex-1 overflow-y-auto px-6'}`}>
            <ProductForm 
              product={editingProduct ? {
                ...editingProduct,
                price: editingProduct.pricePerUnit || editingProduct.price || 0
              } as any : null} 
              onClose={() => {
                setShowAddProduct(false);
                setEditingProduct(null);
              }}
              isMobile={isMobile}
            />
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </ResponsiveLayout>
  );
}
