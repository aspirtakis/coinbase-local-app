import React, { useState } from 'react';
import { ButtonGroup, Button, Col } from 'reactstrap';

const TimeFrameToggle = ({ frame, setFrame }) => {
  const timeFrames = [
    { label: 'M5', value: 300 },
    { label: 'M15 ', value: 900 },
    { label: 'M30 ', value: 1800 },
    { label: 'H1 ', value: 3600 },
    { label: 'H6', value: 21600 },
    { label: 'D1 ', value: 86400 },
  ];

  return (
    <Col sm="12" md="6" lg="4">
      <ButtonGroup className="w-100">
        {timeFrames.map((timeFrame) => (
          <Button
            key={timeFrame.value}
            color={frame === timeFrame.value ? 'primary' : 'secondary'}
            onClick={() => {
              setFrame(timeFrame.value); // Update the frame

            }}
            active={frame === timeFrame.value}
          >
            {timeFrame.label}
          </Button>
        ))}
      </ButtonGroup>
    </Col>
  );
};

export default TimeFrameToggle;
