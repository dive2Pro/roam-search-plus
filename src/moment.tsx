import classNames from "classnames";
import moment from "dayjs";
import * as React from "react";

import { Icon, Intent, Props, Tag } from "@blueprintjs/core";
import { DateRange } from "@blueprintjs/datetime";

import { DateFormatProps } from "@blueprintjs/datetime";
const FORMAT = "dddd, LL";
const FORMAT_TIME = "dddd, LL LT";

export const MomentDate: React.FC<{
  date: Date;
  format?: string;
  withTime?: boolean;
}> = ({ date, withTime = false, format = withTime ? FORMAT_TIME : FORMAT }) => {
  const m = moment(date);
  console.log(date, " -");
  if (date) {
    return <Tag intent={Intent.PRIMARY}>{m.format(format)}</Tag>;
  } else {
    return <Tag minimal={true}>no date</Tag>;
  }
};

export const MomentDateRange: React.FC<
  { range: DateRange; format?: string; withTime?: boolean } & Props
> = ({
  range: [start, end],
  withTime = false,
  format = withTime ? FORMAT_TIME : FORMAT
}) => (
  <div>
    <MomentDate withTime={withTime} date={start} format={format} />
    <Icon icon="arrow-right" />
    <MomentDate withTime={withTime} date={end} format={format} />
  </div>
);

function getMomentFormatter(format: string): DateFormatProps {
  return {
    formatDate: (date) => moment(date).format(format),
    parseDate: (str) => moment(str, format).toDate(),
    placeholder: `${format}`
  };
}

export const MOMENT_FORMATS: DateFormatProps[] = [
  {
    formatDate: (date) => date?.toLocaleDateString() ?? "",
    parseDate: (str) => new Date(Date.parse(str)),
    placeholder: "JS Date"
  },
  getMomentFormatter("MM/DD/YYYY"),
  getMomentFormatter("YYYY-MM-DD"),
  getMomentFormatter("YYYY-MM-DD HH:mm:ss")
];
