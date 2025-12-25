import React from 'react';
import { AgentSettings, DEFAULT_AGENT_SETTINGS, getDefaultTemperatureForModel } from '@/lib/types/agent-settings';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Info, Settings2, RotateCcw, ShieldCheck, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AgentSettings;
  onSettingsChange: (settings: AgentSettings) => void;
  onSaveDefaults?: () => void | Promise<void>;
  onSaveConversation?: () => void | Promise<void>;
  canSaveConversation?: boolean;
  savingDefaults?: boolean;
  savingConversation?: boolean;
}

export function ChatSettingsPanel({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onSaveDefaults,
  onSaveConversation,
  canSaveConversation = false,
  savingDefaults = false,
  savingConversation = false,
}: ChatSettingsPanelProps) {
  
  const updateToolPolicy = (tool: string, enabled: boolean) => {
    onSettingsChange({
      ...settings,
      toolPolicy: {
        ...settings.toolPolicy,
        allowedTools: {
          ...settings.toolPolicy.allowedTools,
          [tool]: enabled
        }
      }
    });
  };

  const updateApproval = (tool: string, required: boolean) => {
    const currentApprovals = settings.toolPolicy.requireApproval;
    const newApprovals = required
      ? [...currentApprovals, tool]
      : currentApprovals.filter(t => t !== tool);
      
    onSettingsChange({
      ...settings,
      toolPolicy: {
        ...settings.toolPolicy,
        requireApproval: newApprovals
      }
    });
  };

  const resetToDefaults = () => {
    onSettingsChange(DEFAULT_AGENT_SETTINGS);
  };

  const isGemini3 = settings.modelName?.startsWith('gemini-3') ?? false;
  const recommendedTemp = getDefaultTemperatureForModel(settings.modelName);
  const tempWarning = isGemini3 && settings.temperature !== recommendedTemp;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col bg-slate-50/50">
        <SheetHeader className="px-6 py-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Configuración del Agente
            </SheetTitle>
            <Button variant="ghost" size="sm" onClick={resetToDefaults} className="h-8 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Restaurar
            </Button>
          </div>
          <SheetDescription>
            Personaliza el comportamiento y las herramientas del agente.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-8">
            
            {/* Parameters Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                Parámetros de Generación
              </h3>
              
              <div className="space-y-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="temperature" className="text-sm font-medium flex items-center gap-1.5">
                      Temperatura (Creatividad)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3.5 h-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              {isGemini3 
                                ? "Para modelos Gemini 3, se recomienda mantener la temperatura en 1.0. Cambiar a valores menores puede causar comportamiento inesperado o degradación del rendimiento."
                                : "Controla la aleatoriedad. Valores bajos (0.1) son más precisos y deterministas. Valores altos (0.8) son más creativos pero menos factuales."}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      {settings.temperature.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    id="temperature"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[settings.temperature]}
                    onValueChange={(value: number[]) => {
                      const [val] = value;
                      // Auto-adjust to 1.0 if Gemini 3 and user tries to set lower
                      const finalTemp = isGemini3 && val < 1.0 ? 1.0 : val;
                      onSettingsChange({ ...settings, temperature: finalTemp ?? settings.temperature });
                    }}
                    className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    <span>Preciso</span>
                    <span>Creativo</span>
                  </div>
                  {tempWarning && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium mb-0.5">Recomendación para Gemini 3</p>
                        <p className="text-amber-700">La temperatura debe ser 1.0 para evitar comportamiento inesperado. Se ajustará automáticamente.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Tools Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                Herramientas y Capacidades
              </h3>

              <div className="space-y-3">
                {/* Web Search Group */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <Label className="font-medium text-sm">Búsqueda Web</Label>
                    <Switch
                      checked={settings.toolPolicy.allowedTools['tavily_web_search'] !== false}
                      onCheckedChange={(checked: boolean) => {
                        updateToolPolicy('tavily_web_search', checked);
                        updateToolPolicy('web_extract', checked);
                        updateToolPolicy('perplexity_search', checked);
                      }}
                    />
                  </div>
                  
                  {settings.toolPolicy.allowedTools['tavily_web_search'] !== false && (
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Búsqueda General (Tavily)</Label>
                          <p className="text-xs text-muted-foreground">Búsqueda rápida en tiempo real</p>
                        </div>
                        <Switch
                          checked={true}
                          onCheckedChange={(c: boolean) => updateToolPolicy('tavily_web_search', c)}
                        />
                      </div>
                      
                      <Separator className="bg-slate-100" />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Investigación Profunda (Perplexity)</Label>
                          <p className="text-xs text-muted-foreground">Análisis complejo multi-fuente (Costoso)</p>
                        </div>
                        <Switch
                          checked={settings.toolPolicy.allowedTools['perplexity_search'] !== false}
                          onCheckedChange={(c: boolean) => updateToolPolicy('perplexity_search', c)}
                        />
                      </div>
                      
                      {settings.toolPolicy.allowedTools['perplexity_search'] !== false && (
                        <div className="flex items-center gap-2 ml-1 mt-2">
                          <div className="h-px w-4 bg-slate-200" />
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                            <Label className="text-xs text-muted-foreground font-normal">Requerir aprobación humana</Label>
                            <Switch
                              className="scale-75 origin-left"
                              checked={settings.toolPolicy.requireApproval.includes('perplexity_search')}
                              onCheckedChange={(c: boolean) => updateApproval('perplexity_search', c)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Company DB Group */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Base de Datos Empresarial</Label>
                      <p className="text-xs text-muted-foreground">Búsqueda de empresas, balances y contactos (Ecuador)</p>
                    </div>
                    <Switch
                      checked={settings.toolPolicy.allowedTools['search_companies'] !== false}
                      onCheckedChange={(c: boolean) => {
                        updateToolPolicy('search_companies', c);
                        updateToolPolicy('search_companies_by_sector', c);
                        updateToolPolicy('get_company_details', c);
                        updateToolPolicy('refine_search', c);
                      }}
                    />
                  </div>
                </div>

                {/* Offerings Group */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Mis Servicios</Label>
                      <p className="text-xs text-muted-foreground">Acceso a tu portafolio para contexto</p>
                    </div>
                    <Switch
                      checked={settings.toolPolicy.allowedTools['list_user_offerings'] !== false}
                      onCheckedChange={(c: boolean) => {
                        updateToolPolicy('list_user_offerings', c);
                        updateToolPolicy('get_offering_details', c);
                      }}
                    />
                  </div>
                </div>

                {/* Contact Enrichment */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Enriquecimiento de Contactos</Label>
                      <p className="text-xs text-muted-foreground">Buscar directivos y representantes</p>
                    </div>
                    <Switch
                      checked={settings.toolPolicy.allowedTools['enrich_company_contacts'] !== false}
                      onCheckedChange={(c: boolean) => updateToolPolicy('enrich_company_contacts', c)}
                    />
                  </div>
                </div>

                {/* Export */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Exportación de Datos</Label>
                      <p className="text-xs text-muted-foreground">Generar archivos Excel/CSV</p>
                    </div>
                    <Switch
                      checked={settings.toolPolicy.allowedTools['export_companies'] !== false}
                      onCheckedChange={(c: boolean) => updateToolPolicy('export_companies', c)}
                    />
                  </div>
                  
                  {settings.toolPolicy.allowedTools['export_companies'] !== false && (
                    <div className="flex items-center gap-2 ml-1">
                      <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        <Label className="text-xs text-muted-foreground font-normal">Requerir aprobación</Label>
                        <Switch
                          className="scale-75 origin-left"
                          checked={settings.toolPolicy.requireApproval.includes('export_companies')}
                          onCheckedChange={(c: boolean) => updateApproval('export_companies', c)}
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </ScrollArea>

        {(onSaveDefaults || onSaveConversation) && (
          <div className="border-t bg-white px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Los cambios se aplican al próximo mensaje. Guarda para conservarlos.
              </div>
              <div className="flex items-center gap-2">
                {onSaveConversation && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canSaveConversation || savingConversation}
                    onClick={onSaveConversation}
                  >
                    {savingConversation ? "Guardando..." : "Guardar en conversación"}
                  </Button>
                )}
                {onSaveDefaults && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={savingDefaults}
                    onClick={onSaveDefaults}
                  >
                    {savingDefaults ? "Guardando..." : "Guardar como predeterminado"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

