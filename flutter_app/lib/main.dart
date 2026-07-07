import 'package:flutter/material.dart';
// import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Initialize Supabase here with your keys before running the app.
  // await Supabase.initialize(url: 'YOUR_SUPABASE_URL', anonKey: 'YOUR_SUPABASE_ANON_KEY');
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  final Color primary = const Color(0xFF1d5f99);
  final Color purple = const Color(0xFF683669);
  final Color red = const Color(0xFFa5243d);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Glamorous Care',
      theme: ThemeData(
        primaryColor: primary,
        colorScheme: ColorScheme.fromSwatch(
          primarySwatch: Colors.blue,
        ).copyWith(secondary: purple),
        appBarTheme: AppBarTheme(
          color: Colors.white,
          iconTheme: IconThemeData(color: primary),
          elevation: 0,
        ),
      ),
      home: HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            // Replace with your logo in assets/logo.png
            Image.asset(
              'assets/logo.png',
              height: 40,
              errorBuilder: (_, __, ___) => SizedBox(width: 40),
            ),
            SizedBox(width: 12),
            Text('Glamorous Care', style: TextStyle(color: Color(0xFF1d5f99))),
          ],
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Welcome to the Glamorous Care app',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  // navigate to login / dashboard
                },
                child: Text('Get Started'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
