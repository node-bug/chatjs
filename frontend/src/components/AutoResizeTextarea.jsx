import React, { forwardRef } from 'react';
import { Textarea } from '@chakra-ui/react';
import ResizeTextarea from 'react-textarea-autosize';

const ResizableTextarea = ({ maxRows, ...props }) => (
  <ResizeTextarea maxRows={maxRows} {...props} />
);

const AutoResizeTextarea = forwardRef((props, ref) => (
  <Textarea
    minH="unset"
    overflow="auto"
    w="100%"
    resize="none"
    ref={ref}
    as={ResizableTextarea}
    {...props}
  />
));

AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export default AutoResizeTextarea;
