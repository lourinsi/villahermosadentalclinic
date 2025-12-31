import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Eraser, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { parseBackendDateToLocal, formatDateToYYYYMMDD } from "../lib/utils";

// NOTE: Dental chart state - stores which sections of which teeth are colored
type ToothSection = "top" | "bottom" | "left" | "right" | "center";
type ToothColor = "none" | "blue" | "red";
type ToothState = Record<ToothSection, ToothColor>;

interface ChartRecord {
  date: string;
  data: string; // JSON stringified Record<number, ToothState>
}

const upperRightAdult = [18, 17, 16, 15, 14, 13, 12, 11];
const upperLeftAdult = [21, 22, 23, 24, 25, 26, 27, 28];
const lowerRightAdult = [48, 47, 46, 45, 44, 43, 42, 41];
const lowerLeftAdult = [31, 32, 33, 34, 35, 36, 37, 38];

const upperRightPrimary = [55, 54, 53, 52, 51];
const upperLeftPrimary = [61, 62, 63, 64, 65];
const lowerRightPrimary = [85, 84, 83, 82, 81];
const lowerLeftPrimary = [71, 72, 73, 74, 75];

interface DentalChartProps {
  records: ChartRecord[];
  onSaveRecords: (records: ChartRecord[]) => void;
}

export function DentalChart({ records, onSaveRecords }: DentalChartProps) {
  const defaultInitialRecord = useMemo(() => [{ date: formatDateToYYYYMMDD(new Date()), data: '{}' }], []);
  // If no records, initialize with one empty record
  const initialRecords = records.length > 0 ? records : defaultInitialRecord;
  
  const [currentIndex, setCurrentIndex] = useState(initialRecords.length - 1);
  const [selectedColor, setSelectedColor] = useState<ToothColor>("blue");
  const [teethState, setTeethState] = useState<Record<number, ToothState>>({});
  const [originalTeethState, setOriginalTeethState] = useState<Record<number, ToothState>>({});
  const [currentDate, setCurrentDate] = useState("");

  // Load teeth state when index or records change
  useEffect(() => {
    const currentRecord = initialRecords[currentIndex];
    if (currentRecord) {
      try {
        const parsedData = JSON.parse(currentRecord.data || '{}');
        setTeethState(parsedData);
        setOriginalTeethState(parsedData);
        setCurrentDate(currentRecord.date);
      } catch (e) {
        setTeethState({});
        setOriginalTeethState({});
        setCurrentDate(formatDateToYYYYMMDD(new Date()));
      }
    }
  }, [currentIndex, records]);

  // This useEffect will now trigger on every change to teethState and call onSaveRecords
  useEffect(() => {
    // To prevent infinite loops, only save if the data has actually changed from what was loaded.
    if (JSON.stringify(teethState) === JSON.stringify(originalTeethState)) {
      return;
    }

    const updatedRecords = [...initialRecords];
    const currentRecord = updatedRecords[currentIndex];

    // This should not happen if logic is correct, but as a safeguard.
    if (!currentRecord) {
        return; 
    }

    // Create a new record object with the updated data
    const newRecord = {
      ...currentRecord,
      data: JSON.stringify(teethState),
    };

    // Replace the old record with the new one
    updatedRecords[currentIndex] = newRecord;

    // Call the callback to update the parent's state
    onSaveRecords(updatedRecords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teethState]);

  const getToothState = (toothNumber: number): ToothState => {
    return teethState[toothNumber] || {
      top: "none",
      bottom: "none",
      left: "none",
      right: "none",
      center: "none"
    };
  };

  const handleSectionClick = (toothNumber: number, section: ToothSection) => {
    setTeethState(prev => {
      const currentTooth = getToothState(toothNumber);
      const currentColor = currentTooth[section];
      
      const newColor = selectedColor === "none" 
        ? "none" 
        : currentColor === selectedColor 
          ? "none" 
          : selectedColor;
      
      return {
        ...prev,
        [toothNumber]: {
          ...currentTooth,
          [section]: newColor
        }
      };
    });
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all markings for this chart?")) {
      setTeethState({});
    }
  };

  const handleUndo = () => {
    setTeethState(originalTeethState);
    toast.info("Changes reverted to the state when the chart was opened.");
  };

  const handleCreateNew = () => {
    const lastRecordDate = initialRecords.length > 0 ? parseBackendDateToLocal(initialRecords[initialRecords.length - 1].date) : new Date();
    lastRecordDate.setDate(lastRecordDate.getDate() + 1);
    
    const newRecord = {
      date: lastRecordDate.toISOString().split('T')[0],
      data: '{}'
    };
    const updatedRecords = [...initialRecords, newRecord];
    onSaveRecords(updatedRecords);
    setCurrentIndex(updatedRecords.length - 1);
    toast.info("New dental chart record created.");
  };
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < initialRecords.length - 1;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Select Color:</span>
              <div className="flex space-x-2">
                <Button
                  variant={selectedColor === "blue" ? "brand" : "outline"}
                  size="sm"
                  onClick={() => setSelectedColor("blue")}
                  className={selectedColor === "blue" ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-600" : ""}
                >
                  Blue
                </Button>
                <Button
                  variant={selectedColor === "red" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setSelectedColor("red")}
                  className={selectedColor === "red" ? "bg-red-500 hover:bg-red-600 text-white border-red-600" : ""}
                >
                  Red
                </Button>
                <Button
                  variant={selectedColor === "none" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSelectedColor("none")}
                >
                  <Eraser className="h-4 w-4 mr-1" />
                  Eraser
                </Button>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="brand" 
                size="sm" 
                onClick={handleCreateNew}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Chart
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={handleUndo}>
                <Undo2 className="h-4 w-4 mr-1" />
                Undo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-6">
            <span className="text-sm font-medium">Legend:</span>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">Cavity/Decay</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Treatment Required</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dental Chart Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Dental Chart Diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8 pb-4">
            <div className="w-full space-y-8 relative">
              {/* Upper Teeth */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-center">Upper Teeth</h3>
                <div className="flex justify-center items-end space-x-1">
                  <div className="flex space-x-1">
                    {upperRightAdult.map((toothNum) => (
                      <ToothDiagram key={toothNum} toothNumber={toothNum} state={getToothState(toothNum)} onSectionClick={handleSectionClick} />
                    ))}
                  </div>
                  <div className="w-px h-32 bg-gray-300 mx-4"></div>
                  <div className="flex space-x-1">
                    {upperLeftAdult.map((toothNum) => (
                      <ToothDiagram key={toothNum} toothNumber={toothNum} state={getToothState(toothNum)} onSectionClick={handleSectionClick} />
                    ))}
                  </div>
                </div>
                <div className="flex justify-center items-end space-x-1">
                  <div className="flex space-x-1 mr-20">
                    {upperRightPrimary.map((toothNum) => (
                      <ToothDiagram key={toothNum} toothNumber={toothNum} state={getToothState(toothNum)} onSectionClick={handleSectionClick} size="small" />
                    ))}
                  </div>
                  <div className="w-px mx-4"></div>
                  <div className="flex space-x-1 ml-20">
                    {upperLeftPrimary.map((toothNum) => (
                      <ToothDiagram key={toothNum} toothNumber={toothNum} state={getToothState(toothNum)} onSectionClick={handleSectionClick} size="small" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-gray-100"></div>

              {/* Lower Teeth */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-center">Lower Teeth</h3>
                <div className="flex justify-center items-start space-x-1">
                  <div className="flex space-x-1 mr-20">
                    {lowerRightPrimary.map((toothNum) => (
                      <ToothDiagram key={toothNum} toothNumber={toothNum} state={getToothState(toothNum)} onSectionClick={handleSectionClick} size="small" />
                    ))}
                  </div>
                  <div className="w-px mx-4"></div>
                  <div className="flex space-x-1 ml-20">
                    {lowerLeftPrimary.map((toothNum) => (
                      <ToothDiagram key={toothNum} toothNumber={toothNum} state={getToothState(toothNum)} onSectionClick={handleSectionClick} size="small" />
                    ))}
                  </div>
                </div>
                <div className="flex justify-center items-start space-x-1">
                  <div className="flex space-x-1">
                    {lowerRightAdult.map((toothNum) => (
                      <ToothDiagram key={toothNum} toothNumber={toothNum} state={getToothState(toothNum)} onSectionClick={handleSectionClick} />
                    ))}
                  </div>
                  <div className="w-px h-32 bg-gray-300 mx-4"></div>
                  <div className="flex space-x-1">
                    {lowerLeftAdult.map((toothNum) => (
                      <ToothDiagram key={toothNum} toothNumber={toothNum} state={getToothState(toothNum)} onSectionClick={handleSectionClick} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Pagination */}
              <div className="flex justify-center mt-12">
                <div className="flex items-center space-x-1 bg-white border rounded-md px-2 py-1 shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400"
                    onClick={() => setCurrentIndex(0)}
                    disabled={!canGoPrevious}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400"
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    disabled={!canGoPrevious}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="px-4 text-sm font-medium text-gray-600">
                    {parseBackendDateToLocal(currentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400"
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    disabled={!canGoNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400"
                    onClick={() => setCurrentIndex(initialRecords.length - 1)}
                    disabled={!canGoNext}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ToothDiagramProps {
  toothNumber: number;
  state: ToothState;
  onSectionClick: (toothNumber: number, section: ToothSection) => void;
  size?: "normal" | "small";
}

function ToothDiagram({ toothNumber, state, onSectionClick, size = "normal" }: ToothDiagramProps) {
  const isSmall = size === "small";
  const circleSize = isSmall ? 40 : 50;
  const center = circleSize / 2;
  const outerRadius = center - 2;
  const innerRadius = outerRadius * 0.4;

  const getColorClass = (color: ToothColor) => {
    switch (color) {
      case "blue": return "fill-blue-500";
      case "red": return "fill-red-500";
      default: return "fill-white";
    }
  };

  const createSectionPath = (section: ToothSection): string => {
    switch (section) {
      case "top":
        return `M ${center} ${center} L ${center - outerRadius * 0.707} ${center - outerRadius * 0.707} A ${outerRadius} ${outerRadius} 0 0 1 ${center + outerRadius * 0.707} ${center - outerRadius * 0.707} Z`;
      case "right":
        return `M ${center} ${center} L ${center + outerRadius * 0.707} ${center - outerRadius * 0.707} A ${outerRadius} ${outerRadius} 0 0 1 ${center + outerRadius * 0.707} ${center + outerRadius * 0.707} Z`;
      case "bottom":
        return `M ${center} ${center} L ${center + outerRadius * 0.707} ${center + outerRadius * 0.707} A ${outerRadius} ${outerRadius} 0 0 1 ${center - outerRadius * 0.707} ${center + outerRadius * 0.707} Z`;
      case "left":
        return `M ${center} ${center} L ${center - outerRadius * 0.707} ${center + outerRadius * 0.707} A ${outerRadius} ${outerRadius} 0 0 1 ${center - outerRadius * 0.707} ${center - outerRadius * 0.707} Z`;
      case "center":
        return `M ${center} ${center} m -${innerRadius}, 0 a ${innerRadius},${innerRadius} 0 1,0 ${innerRadius * 2},0 a ${innerRadius},${innerRadius} 0 1,0 -${innerRadius * 2},0`;
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`${isSmall ? 'text-[10px]' : 'text-xs'} font-medium text-gray-500 mb-1`}>{toothNumber}</div>
      <svg width={circleSize} height={circleSize} className="cursor-pointer hover:opacity-80 transition-opacity">
        <circle cx={center} cy={center} r={outerRadius} className="fill-white stroke-gray-300" strokeWidth="1.5" />
        <path d={createSectionPath("top")} className={`${getColorClass(state.top)} stroke-gray-300 hover:opacity-70 transition-opacity cursor-pointer`} strokeWidth="1" onClick={() => onSectionClick(toothNumber, "top")} />
        <path d={createSectionPath("right")} className={`${getColorClass(state.right)} stroke-gray-300 hover:opacity-70 transition-opacity cursor-pointer`} strokeWidth="1" onClick={() => onSectionClick(toothNumber, "right")} />
        <path d={createSectionPath("bottom")} className={`${getColorClass(state.bottom)} stroke-gray-300 hover:opacity-70 transition-opacity cursor-pointer`} strokeWidth="1" onClick={() => onSectionClick(toothNumber, "bottom")} />
        <path d={createSectionPath("left")} className={`${getColorClass(state.left)} stroke-gray-300 hover:opacity-70 transition-opacity cursor-pointer`} strokeWidth="1" onClick={() => onSectionClick(toothNumber, "left")} />
        <circle cx={center} cy={center} r={innerRadius} className={`${getColorClass(state.center)} stroke-gray-300 hover:opacity-70 transition-opacity cursor-pointer`} strokeWidth="1" onClick={() => onSectionClick(toothNumber, "center")} />
      </svg>
    </div>
  );
}
