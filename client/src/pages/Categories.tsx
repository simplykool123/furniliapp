import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Package, Tag, Users, Settings } from "lucide-react";
import { CategoryForm } from "@/components/Categories/CategoryForm";
import { CategoryTable } from "@/components/Categories/CategoryTable";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import type { Category } from "@shared/schema";

export default function Categories() {
  const [isCreating, setIsCreating] = useState(false);
  const isMobile = useIsMobile();

  const {
    data: categoriesData = [],
    isLoading,
    error,
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Sort categories alphabetically by name
  const categories = [...categoriesData].sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  const totalCategories = categories.length;
  const activeCategories = categories.filter(cat => cat.isActive).length;

  return (
    <ResponsiveLayout
      title="Categories Management"
      subtitle="Organize and manage product categories"
    >
      <div className="space-y-4">
        {/* Mobile-optimized Header */}
        <MobileCard className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
            </div>
          <Button 
            onClick={() => setIsCreating(true)}
            className={`furnili-gradient hover:opacity-90 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 ${isMobile ? 'w-full' : ''}`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      </MobileCard>

      {/* Statistics Cards */}
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'md:grid-cols-3'}`}>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center">
            <Tag className="h-4 w-4 text-blue-600" />
            <h3 className="ml-2 font-medium text-sm">Total Categories</h3>
          </div>
          <div className="mt-1">
            <div className="text-xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">All categories</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center">
            <Package className="h-4 w-4 text-green-600" />
            <h3 className="ml-2 font-medium text-sm">Active Categories</h3>
          </div>
          <div className="mt-1">
            <div className="text-xl font-bold">{activeCategories}</div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center">
            <Settings className="h-4 w-4 text-orange-600" />
            <h3 className="ml-2 font-medium text-sm">Inactive Categories</h3>
          </div>
          <div className="mt-1">
            <div className="text-xl font-bold">{totalCategories - activeCategories}</div>
            <p className="text-xs text-muted-foreground">Disabled</p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-md bg-destructive/15 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">
            Failed to load categories. Please try refreshing the page.
          </p>
        </div>
      )}

      {/* Categories List Section */}
      <MobileCard>
        <CategoryTable 
          categories={categories}
          isLoading={isLoading}
        />
      </MobileCard>
      
        {/* Hidden Dialog for Add Category */}
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <CategoryForm onSuccess={() => setIsCreating(false)} />
        </Dialog>
      </div>
    </ResponsiveLayout>
  );
}