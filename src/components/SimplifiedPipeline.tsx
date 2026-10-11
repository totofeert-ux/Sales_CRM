import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp,
  Clock,
  FileCheck,
  CheckCircle2,
  ArrowRight
} from "lucide-react"

const pipelineStages = [
  {
    title: "En cours",
    count: 8,
    amount: "€47,500",
    icon: Clock,
    color: "chart-2",
    bgColor: "bg-chart-2/10"
  },
  {
    title: "Proposition envoyée", 
    count: 5,
    amount: "€32,800",
    icon: FileCheck,
    color: "warning",
    bgColor: "bg-warning/10"
  },
  {
    title: "Signé ce mois",
    count: 3,
    amount: "€18,200",
    icon: CheckCircle2,
    color: "success",
    bgColor: "bg-success/10"
  }
]

export function SimplifiedPipeline() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pipeline
          </CardTitle>
          <Button variant="outline" size="sm">
            Voir le pipeline complet
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pipelineStages.map((stage) => (
            <div key={stage.title} className={`p-4 rounded-lg border ${stage.bgColor} hover:shadow-md transition-all cursor-pointer`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-background/50`}>
                  <stage.icon className={`h-5 w-5 text-${stage.color}`} />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {stage.count}
                </Badge>
              </div>
              
              <h3 className="font-medium text-sm mb-1">{stage.title}</h3>
              <div className="text-xl font-bold text-primary">{stage.amount}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stage.count} deal{stage.count > 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}