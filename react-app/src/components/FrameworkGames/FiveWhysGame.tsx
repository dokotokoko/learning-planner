import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, Stepper, Step, StepLabel, StepContent } from '@mui/material';

const FiveWhysGame: React.FC = () => {
  const [problem, setProblem] = useState('');
  const [whys, setWhys] = useState<string[]>(Array(5).fill(''));
  const [rootCause, setRootCause] = useState('');
  const [activeStep, setActiveStep] = useState(0);

  const handleWhyChange = (index: number, value: string) => {
    const newWhys = [...whys];
    newWhys[index] = value;
    setWhys(newWhys);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  const handleReset = () => {
    setProblem('');
    setWhys(Array(5).fill(''));
    setRootCause('');
    setActiveStep(0);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          5-Whys ゲーム
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" paragraph>
          問題の根本原因を見つけるまで、「なぜ？」を5回繰り返してみましょう。
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            <Step>
              <StepLabel>Step 1: 問題を定義する</StepLabel>
              <StepContent>
                <TextField
                  fullWidth
                  label="解決したい問題"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  variant="outlined"
                  margin="normal"
                />
                <Box sx={{ mb: 2 }}>
                  <div>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={!problem}
                    >
                      次へ
                    </Button>
                  </div>
                </Box>
              </StepContent>
            </Step>

            {whys.map((why, index) => (
              <Step key={index}>
                <StepLabel>なぜ？ #{index + 1}</StepLabel>
                <StepContent>
                  <Typography color="text.secondary" sx={{mb: 2}}>{index === 0 ? problem : whys[index-1]}</Typography>
                  <TextField
                    fullWidth
                    label={`なぜそれが起きたのか？ (${index + 1}/5)`}
                    value={why}
                    onChange={(e) => handleWhyChange(index, e.target.value)}
                    variant="outlined"
                    margin="normal"
                  />
                  <Box sx={{ mb: 2 }}>
                    <div>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{ mt: 1, mr: 1 }}
                        disabled={!why}
                      >
                        {index === 4 ? '完了' : '次へ'}
                      </Button>
                      <Button
                        onClick={handleBack}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        戻る
                      </Button>
                    </div>
                  </Box>
                </StepContent>
              </Step>
            ))}
            
            <Step>
                <StepLabel>Step 2: 根本原因の特定</StepLabel>
                <StepContent>
                    <Typography>お疲れ様でした！5回の「なぜ？」を経て、問題の根本原因が見えてきましたか？</Typography>
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>根本原因:</Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography>{whys[4]}</Typography>
                    </Paper>
                     <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
                        リセットしてもう一度挑戦
                    </Button>
                     <Button
                        onClick={handleBack}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        戻る
                      </Button>
                </StepContent>
            </Step>

          </Stepper>
        </Box>
      </Paper>
    </Container>
  );
};

export default FiveWhysGame; 