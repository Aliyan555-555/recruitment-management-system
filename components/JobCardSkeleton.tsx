import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


// You may want to replace this with your own Skeleton implementation
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-muted ${className}`} />;
}

export function JobCardSkeleton() {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1 w-3/4">
            <Skeleton className="h-6 w-1/2 mb-2 rounded" />
            <Skeleton className="h-4 w-1/3 rounded" />
          </div>
          <Badge variant="secondary">
            <Skeleton className="h-6 w-16 rounded" />
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-4 rounded" />
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="flex border-none items-center gap-1 p-0">
            {/* <MapPin className="h-3 w-3" /> */}
            <Skeleton className="h-3 w-12 rounded" />
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 p-0">
            {/* <Calendar className="h-3 w-3" /> */}
            <Skeleton className="h-3 w-20  rounded" />
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 p-0">
            {/* <Users className="h-3 w-3" /> */}
            <Skeleton className="h-3 w-16 rounded" />
          </Badge>
        </div>
        <div className="mb-4">
          {/* <p className="text-sm font-medium mb-2">Required Skills:</p> */}
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map(i => (
              <Badge key={i} variant="secondary">
                <Skeleton className="h-4 w-14 rounded" />
              </Badge>
            ))}
            <Badge variant="secondary">
              <Skeleton className="h-4 w-10 rounded" />
            </Badge>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <Skeleton className="h-4 w-24 rounded" />
       
            <Skeleton className="h-8 w-24 rounded" />
      
        </div>
      </CardContent>
    </Card>
  );
}
