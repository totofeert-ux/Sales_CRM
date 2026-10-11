import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  FileText,
  Mail,
  Phone,
  Calculator,
  MessageSquare,
  Download
} from "lucide-react"

const templates = [
  {
    title: "Créer un devis",
    description: "Nouveau devis personnalisé",
    icon: Calculator,
    color: "primary",
    action: "create"
  },
  {
    title: "Email de relance",
    description: "Template de follow-up",
    icon: Mail,
    color: "chart-2",
    action: "template"
  },
  {
    title: "Script d'appel",
    description: "Guide de découverte client",
    icon: Phone,
    color: "chart-4",
    action: "view"
  },
  {
    title: "Présentation produit",
    description: "Slides de démo",
    icon: FileText,
    color: "warning",
    action: "open"
  },
  {
    title: "Contrat type",
    description: "Modèle de contrat",
    icon: Download,
    color: "chart-5",
    action: "download"
  },
  {
    title: "Objections courantes",
    description: "Réponses préparées",
    icon: MessageSquare,
    color: "success",
    action: "view"
  }
]

export function TemplatesDocuments() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Templates & Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((template) => (
            <Button
              key={template.title}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2 hover:shadow-md transition-all"
            >
              <div className={`p-2 rounded-lg bg-${template.color}/10 self-start`}>
                <template.icon className={`h-5 w-5 text-${template.color}`} />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">{template.title}</div>
                <div className="text-xs text-muted-foreground">{template.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}