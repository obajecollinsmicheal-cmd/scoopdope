import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DatePicker } from './DatePicker';

const meta = {
  title: 'UI/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = useState<Date | null>(null);
    return (
      <DatePicker
        label="Select a date"
        value={date}
        onChange={setDate}
      />
    );
  },
};

export const WithInitialValue: Story = {
  render: () => {
    const [date, setDate] = useState<Date | null>(new Date());
    return (
      <DatePicker
        label="Date of birth"
        value={date}
        onChange={setDate}
      />
    );
  },
};

export const WithMinMaxDates: Story = {
  render: () => {
    const today = new Date();
    const min = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const max = new Date(today.getFullYear(), today.getMonth() + 3, 0);
    const [date, setDate] = useState<Date | null>(null);
    return (
      <DatePicker
        label="Enrollment deadline"
        placeholder="Choose a future date"
        value={date}
        onChange={setDate}
        minDate={min}
        maxDate={max}
      />
    );
  },
};
