"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeadStatus } from "@/types";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  status: LeadStatus;
  count: number;
  percentage: string;
  config: {
    icon: React.ReactNode;
    color: string;
    description: string;
  };
  onView: () => void;
}

export default function StatusCard({ status, count, percentage, config, onView }: StatusCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <Card className="bg-[#111114] border-white/5 hover:border-violet-500/30 transition-all overflow-hidden group">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg bg-white/5 group-hover:bg-violet-500/10 transition-colors"
                style={{ color: config.color }}
              >
                {config.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight uppercase opacity-80">
                  {status.replace(/_/g, ' ')}
                </h3>
                <p className="text-[10px] text-neutral-500 font-medium">
                  {config.description}
                </p>
              </div>
            </div>
            <span className="text-xl font-bold text-white tabular-nums">
              {count}
            </span>
          </div>

          {/* Premium Neon Progress Bar */}
          <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: "circOut" }}
              className="absolute inset-y-0 left-0 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]"
              style={{ backgroundColor: config.color }}
            />
          </div>

          <div className="flex justify-between items-center mt-3">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              {percentage}% of Total
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onView}
              className="h-6 px-2 text-[10px] font-bold uppercase text-neutral-400 hover:text-white hover:bg-white/5"
            >
              View Details <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}