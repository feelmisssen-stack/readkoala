import { BookOpen, Image, Lightbulb, PenLine, Quote, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReflectionSection } from "./reflection-templates";

export const SECTION_ICONS: Record<ReflectionSection, LucideIcon> = {
  before_reading: Sprout,
  during_reading: BookOpen,
  association: Lightbulb,
  quote: Quote,
  review: PenLine,
  memorable_scene: Image,
};
