const sanitizeInput = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/'/g, "''").toLowerCase();
  };
 
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
 
  const isStrongPassword = (password) => {
    if (!password) return false;
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return passRegex.test(password.trim());
  };
 
 
  // Checks if required fields exist and are non-empty
  const validateRequired = (fields, requiredKeys) => {
    for (const key of requiredKeys) {
      if (!fields[key] || !String(fields[key]).trim()) {
        return `${key} is required`;
      }
    }
    return null; // no errors
  };
 
  const validateEmail = (email) => {
    if (!email) return 'Email is required';
    if (!isValidEmail(email)) return 'Invalid email format';
    return null;
  };
 
  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (!isStrongPassword(password))
      return 'Password must have 8+ chars, upper, lower, number, and special char';
    return null;
  };

const validateSignup = (req, res, next) => {
    let { name, email, password } = req.body;

    name = sanitizeInput(name);
    email = sanitizeInput(email);

    const requiredError = validateRequired({ name, email, password }, ['name', 'email', 'password']);
    if (requiredError) return res.status(400).json({ error: requiredError});

    const emailError = validateEmail(email);
    if (emailError) return res.status(400).json({ error: emailError});

    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError});

    req.body = { name, email, password, role: 'user'};                                                                    
    next();

};

module.exports={
    validateSignup

}