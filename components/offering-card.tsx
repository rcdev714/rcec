
import { UserOffering } from '@/types/user-offering';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OfferingCardProps {
  offering: UserOffering;
}

export default function OfferingCard({ offering }: OfferingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{offering.offering_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">{offering.description}</p>
        <div className="flex flex-wrap gap-2">
          {offering.industry_targets?.map((target) => (
            <Badge key={target} variant="secondary">
              {target}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

